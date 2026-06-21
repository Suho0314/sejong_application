import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateWorkbookAssignmentDto } from './dto/create-workbook-assignment.dto';
import { ListWorkbookAssignmentsDto } from './dto/list-workbook-assignments.dto';
import { UpdateWorkbookAssignmentDto } from './dto/update-workbook-assignment.dto';
import {
  WorkbookAssignmentResponse,
  WorkbookAssignmentRow,
} from './workbook-assignment.types';

type DbError = {
  code?: string;
};

@Injectable()
export class WorkbookAssignmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listAssignments(query: ListWorkbookAssignmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [];
    const whereClauses = [
      'workbook_assignments.deleted_at IS NULL',
      'workbooks.deleted_at IS NULL',
      'cohorts.deleted_at IS NULL',
    ];

    if (query.workbookId) {
      values.push(query.workbookId);
      whereClauses.push(`workbook_assignments.workbook_id = $${values.length}`);
    }

    if (query.cohortId) {
      values.push(query.cohortId);
      whereClauses.push(`workbook_assignments.cohort_id = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`workbook_assignments.status = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<WorkbookAssignmentRow>(
        `${this.baseSelectSql()}
         WHERE ${whereSql}
         GROUP BY workbook_assignments.id, workbooks.id, cohorts.id
         ORDER BY workbook_assignments.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        dataValues,
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM workbook_assignments
         JOIN workbooks ON workbooks.id = workbook_assignments.workbook_id
         JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toResponse(row, true)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getAssignment(assignmentId: string) {
    const assignment = await this.findAssignmentById(assignmentId);
    return { data: this.toResponse(assignment, true) };
  }

  async createAssignment(
    workbookId: string,
    body: CreateWorkbookAssignmentDto,
    userId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    this.assertDateRange(body.opensAt, body.closesAt);

    try {
      await Promise.all([
        this.assertWorkbookExists(workbookId),
        this.assertCohortExists(body.cohortId),
      ]);

      const assignedByTeacherId = await this.resolveAssignedByTeacherId(userId);
      const result = await this.databaseService.getPool().query<WorkbookAssignmentRow>(
        `INSERT INTO workbook_assignments (
           workbook_id,
           cohort_id,
           assigned_by_teacher_id,
           status,
           opens_at,
           closes_at,
           max_attempts
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          workbookId,
          body.cohortId,
          assignedByTeacherId,
          body.status ?? 'scheduled',
          body.opensAt,
          body.closesAt ?? null,
          body.maxAttempts ?? 1,
        ],
      );

      const assignment = await this.findAssignmentById(result.rows[0].id);
      return { data: this.toResponse(assignment, true) };
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateAssignment(assignmentId: string, body: UpdateWorkbookAssignmentDto) {
    const current = await this.findAssignmentById(assignmentId);
    const opensAt = body.opensAt ?? current.opens_at;
    const closesAt = body.closesAt === undefined ? current.closes_at : body.closesAt;

    this.assertDateRange(opensAt, closesAt);

    const result = await this.databaseService.getPool().query<{ id: string }>(
      `UPDATE workbook_assignments
       SET
         status = COALESCE($2, status),
         opens_at = COALESCE($3, opens_at),
         closes_at = $4,
         max_attempts = COALESCE($5, max_attempts),
         updated_at = now()
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [
        assignmentId,
        body.status ?? null,
        body.opensAt ?? null,
        closesAt,
        body.maxAttempts ?? null,
      ],
    );

    if (result.rowCount === 0) {
      throw this.notFound();
    }

    const assignment = await this.findAssignmentById(assignmentId);
    return { data: this.toResponse(assignment, false) };
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    const result = await this.databaseService.getPool().query(
      `UPDATE workbook_assignments
       SET deleted_at = now(),
           updated_at = now()
       WHERE id = $1
         AND deleted_at IS NULL`,
      [assignmentId],
    );

    if (result.rowCount === 0) {
      throw this.notFound();
    }
  }

  private baseSelectSql(): string {
    return `SELECT
      workbook_assignments.id,
      workbook_assignments.workbook_id,
      workbooks.title AS workbook_title,
      workbook_assignments.cohort_id,
      cohorts.name AS cohort_name,
      workbook_assignments.assigned_by_teacher_id,
      workbook_assignments.status,
      workbook_assignments.opens_at,
      workbook_assignments.closes_at,
      workbook_assignments.max_attempts,
      COUNT(submissions.id) AS submission_count,
      workbook_assignments.created_at,
      workbook_assignments.updated_at
    FROM workbook_assignments
    JOIN workbooks ON workbooks.id = workbook_assignments.workbook_id
    JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
    LEFT JOIN submissions
      ON submissions.workbook_assignment_id = workbook_assignments.id
     AND submissions.deleted_at IS NULL`;
  }

  private async findAssignmentById(assignmentId: string): Promise<WorkbookAssignmentRow> {
    const result = await this.databaseService.getPool().query<WorkbookAssignmentRow>(
      `${this.baseSelectSql()}
       WHERE workbook_assignments.id = $1
         AND workbook_assignments.deleted_at IS NULL
         AND workbooks.deleted_at IS NULL
         AND cohorts.deleted_at IS NULL
       GROUP BY workbook_assignments.id, workbooks.id, cohorts.id
       LIMIT 1`,
      [assignmentId],
    );

    const assignment = result.rows[0];

    if (!assignment) {
      throw this.notFound();
    }

    return assignment;
  }

  private async assertWorkbookExists(workbookId: string): Promise<void> {
    const result = await this.databaseService.getPool().query(
      `SELECT id
       FROM workbooks
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [workbookId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException({
        error: {
          code: 'WORKBOOK_NOT_FOUND',
          message: '문제집을 찾을 수 없습니다.',
          details: [],
        },
      });
    }
  }

  private async assertCohortExists(cohortId: string): Promise<void> {
    const result = await this.databaseService.getPool().query(
      `SELECT id
       FROM cohorts
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [cohortId],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException({
        error: {
          code: 'COHORT_NOT_FOUND',
          message: '기수를 찾을 수 없습니다.',
          details: [],
        },
      });
    }
  }

  private async resolveAssignedByTeacherId(userId: string): Promise<string> {
    const result = await this.databaseService.getPool().query<{ id: string }>(
      `SELECT teachers.id
       FROM teachers
       WHERE teachers.user_id = $1
         AND teachers.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );

    if (result.rows[0]?.id) {
      return result.rows[0].id;
    }

    const fallback = await this.databaseService.getPool().query<{ id: string }>(
      `SELECT teachers.id
       FROM teachers
       JOIN users ON users.id = teachers.user_id
       WHERE teachers.deleted_at IS NULL
         AND users.deleted_at IS NULL
         AND users.status = 'active'
       ORDER BY teachers.created_at ASC
       LIMIT 1`,
    );

    const teacherId = fallback.rows[0]?.id;

    if (!teacherId) {
      throw new UnprocessableEntityException({
        error: {
          code: 'ASSIGNER_TEACHER_NOT_FOUND',
          message: '배포자를 강사로 연결할 수 없습니다.',
          details: [],
        },
      });
    }

    return teacherId;
  }

  private assertDateRange(opensAt: string | Date, closesAt?: string | Date | null): void {
    const opensAtDate = new Date(opensAt);
    const closesAtDate = closesAt ? new Date(closesAt) : null;

    if (Number.isNaN(opensAtDate.getTime())) {
      throw this.invalidDateRange('배포 시작일이 올바르지 않습니다.');
    }

    if (closesAtDate && Number.isNaN(closesAtDate.getTime())) {
      throw this.invalidDateRange('배포 마감일이 올바르지 않습니다.');
    }

    if (closesAtDate && closesAtDate <= opensAtDate) {
      throw this.invalidDateRange('배포 마감일은 시작일보다 늦어야 합니다.');
    }
  }

  private invalidDateRange(message: string): UnprocessableEntityException {
    return new UnprocessableEntityException({
      error: {
        code: 'INVALID_ASSIGNMENT_DATE_RANGE',
        message,
        details: [],
      },
    });
  }

  private toResponse(
    row: WorkbookAssignmentRow,
    includeSubmissionCount: boolean,
  ): WorkbookAssignmentResponse {
    return {
      id: row.id,
      workbook: {
        id: row.workbook_id,
        title: row.workbook_title,
      },
      cohort: {
        id: row.cohort_id,
        name: row.cohort_name,
      },
      assignedByTeacherId: row.assigned_by_teacher_id,
      status: row.status,
      opensAt: row.opens_at.toISOString(),
      closesAt: row.closes_at ? row.closes_at.toISOString() : null,
      maxAttempts: row.max_attempts,
      ...(includeSubmissionCount ? { submissionCount: Number(row.submission_count) } : {}),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private handleWriteError(error: unknown): never {
    const dbError = error as DbError;

    if (dbError.code === '23505') {
      throw new ConflictException({
        error: {
          code: 'WORKBOOK_ASSIGNMENT_ALREADY_EXISTS',
          message: '이미 해당 기수에 배포된 문제집입니다.',
          details: [],
        },
      });
    }

    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'WORKBOOK_ASSIGNMENT_NOT_FOUND',
        message: '문제집 배포를 찾을 수 없습니다.',
        details: [],
      },
    });
  }
}
