import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CohortResponse, CohortRow } from './cohort.types';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { ListCohortsDto } from './dto/list-cohorts.dto';
import { UpdateCohortDto } from './dto/update-cohort.dto';

type DbError = {
  code?: string;
};

@Injectable()
export class CohortsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listCohorts(query: ListCohortsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const whereClauses = ['cohorts.deleted_at IS NULL'];
    const values: Array<string | number | boolean> = [];

    if (query.keyword?.trim()) {
      values.push(`%${query.keyword.trim()}%`);
      whereClauses.push(
        `(cohorts.name ILIKE $${values.length} OR cohorts.code ILIKE $${values.length})`,
      );
    }

    if (typeof query.isActive === 'boolean') {
      values.push(query.isActive);
      whereClauses.push(`cohorts.is_active = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<CohortRow>(
        `SELECT
           cohorts.id,
           cohorts.name,
           cohorts.code,
           cohorts.description,
           cohorts.starts_on::text AS starts_on,
           cohorts.ends_on::text AS ends_on,
           cohorts.is_active,
           COUNT(students.id) AS student_count,
           cohorts.created_at,
           cohorts.updated_at
         FROM cohorts
         LEFT JOIN students
           ON students.cohort_id = cohorts.id
          AND students.deleted_at IS NULL
         WHERE ${whereSql}
         GROUP BY cohorts.id
         ORDER BY cohorts.starts_on DESC, cohorts.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        dataValues,
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM cohorts
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toResponse(row)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getCohort(cohortId: string) {
    const cohort = await this.findCohortById(cohortId);
    return { data: this.toResponse(cohort) };
  }

  async createCohort(body: CreateCohortDto) {
    this.assertDateRange(body.startsOn, body.endsOn);

    try {
      const result = await this.databaseService.getPool().query<CohortRow>(
        `INSERT INTO cohorts (
           name,
           code,
           description,
           starts_on,
           ends_on,
           is_active,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           name,
           code,
           description,
           starts_on,
           ends_on,
           is_active,
           0 AS student_count,
           created_at,
           updated_at`,
        [
          body.name,
          body.code,
          body.description ?? null,
          body.startsOn,
          body.endsOn ?? null,
          body.isActive ?? true,
          this.resolveStatus(body.isActive ?? true, body.endsOn ?? null),
        ],
      );

      return {
        data: this.toResponse({
          ...result.rows[0],
          starts_on: body.startsOn,
          ends_on: body.endsOn ?? null,
          student_count: '0',
        }),
      };
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateCohort(cohortId: string, body: UpdateCohortDto) {
    const current = await this.findCohortById(cohortId);
    const startsOn = body.startsOn ?? current.starts_on;
    const endsOn = body.endsOn === undefined ? current.ends_on : body.endsOn;
    const isActive = body.isActive ?? current.is_active;

    this.assertDateRange(startsOn, endsOn);

    try {
      const result = await this.databaseService.getPool().query<CohortRow>(
        `UPDATE cohorts
         SET
           name = COALESCE($2, name),
           code = COALESCE($3, code),
           description = $4,
           starts_on = COALESCE($5, starts_on),
           ends_on = $6,
           is_active = COALESCE($7, is_active),
           status = $8,
           updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING
           id,
           name,
           code,
           description,
           starts_on,
           ends_on,
           is_active,
           (
             SELECT COUNT(*)
             FROM students
             WHERE students.cohort_id = cohorts.id
               AND students.deleted_at IS NULL
           ) AS student_count,
           created_at,
           updated_at`,
        [
          cohortId,
          body.name ?? null,
          body.code ?? null,
          body.description === undefined ? current.description : body.description,
          body.startsOn ?? null,
          endsOn,
          body.isActive ?? null,
          this.resolveStatus(isActive, endsOn),
        ],
      );

      return { data: this.toResponse(result.rows[0]) };
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async deleteCohort(cohortId: string): Promise<void> {
    const result = await this.databaseService.getPool().query(
      `UPDATE cohorts
       SET deleted_at = now(),
           updated_at = now()
       WHERE id = $1
         AND deleted_at IS NULL`,
      [cohortId],
    );

    if (result.rowCount === 0) {
      throw this.notFound();
    }
  }

  private async findCohortById(cohortId: string): Promise<CohortRow> {
    const result = await this.databaseService.getPool().query<CohortRow>(
      `SELECT
         cohorts.id,
         cohorts.name,
         cohorts.code,
         cohorts.description,
         cohorts.starts_on::text AS starts_on,
         cohorts.ends_on::text AS ends_on,
         cohorts.is_active,
         COUNT(students.id) AS student_count,
         cohorts.created_at,
         cohorts.updated_at
       FROM cohorts
       LEFT JOIN students
         ON students.cohort_id = cohorts.id
        AND students.deleted_at IS NULL
       WHERE cohorts.id = $1
         AND cohorts.deleted_at IS NULL
       GROUP BY cohorts.id
       LIMIT 1`,
      [cohortId],
    );

    const cohort = result.rows[0];

    if (!cohort) {
      throw this.notFound();
    }

    return cohort;
  }

  private toResponse(row: CohortRow): CohortResponse {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      startsOn: this.toDateString(row.starts_on) ?? '',
      endsOn: this.toDateString(row.ends_on),
      isActive: row.is_active,
      studentCount: Number(row.student_count),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toDateString(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0'),
      ].join('-');
    }

    return value.slice(0, 10);
  }

  private assertDateRange(
    startsOn: string | Date | null | undefined,
    endsOn?: string | Date | null,
  ): void {
    const normalizedStartsOn = this.toDateString(startsOn);
    const normalizedEndsOn = this.toDateString(endsOn);

    if (normalizedStartsOn && normalizedEndsOn && normalizedEndsOn < normalizedStartsOn) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_DATE_RANGE',
          message: '종료일은 시작일보다 빠를 수 없습니다.',
          details: [],
        },
      });
    }
  }

  private resolveStatus(
    isActive: boolean,
    endsOn?: string | Date | null,
  ): 'planned' | 'active' | 'completed' {
    if (!isActive) {
      return 'completed';
    }

    const normalizedEndsOn = this.toDateString(endsOn);

    if (normalizedEndsOn && normalizedEndsOn < new Date().toISOString().slice(0, 10)) {
      return 'completed';
    }

    return 'active';
  }

  private handleWriteError(error: unknown): never {
    const dbError = error as DbError;

    if (dbError.code === '23505') {
      throw new ConflictException({
        error: {
          code: 'COHORT_CODE_ALREADY_EXISTS',
          message: '이미 사용 중인 기수 코드입니다.',
          details: [],
        },
      });
    }

    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'COHORT_NOT_FOUND',
        message: '기수를 찾을 수 없습니다.',
        details: [],
      },
    });
  }
}
