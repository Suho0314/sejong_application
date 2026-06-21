import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentResponse, StudentRow } from './student.types';

type DbError = {
  code?: string;
  constraint?: string;
};

@Injectable()
export class StudentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listStudents(query: ListStudentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [];
    const whereClauses = [
      'students.deleted_at IS NULL',
      'users.deleted_at IS NULL',
      'cohorts.deleted_at IS NULL',
    ];

    if (query.cohortId) {
      values.push(query.cohortId);
      whereClauses.push(`students.cohort_id = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`students.status = $${values.length}`);
    }

    if (query.keyword?.trim()) {
      values.push(`%${query.keyword.trim()}%`);
      whereClauses.push(
        `(users.name ILIKE $${values.length}
          OR users.login_id ILIKE $${values.length}
          OR users.email ILIKE $${values.length}
          OR students.student_no ILIKE $${values.length}
          OR students.phone ILIKE $${values.length})`,
      );
    }

    const whereSql = whereClauses.join(' AND ');
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<StudentRow>(
        `${this.baseSelectSql()}
         WHERE ${whereSql}
         ORDER BY students.created_at DESC, users.name ASC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        dataValues,
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM students
         JOIN users ON users.id = students.user_id
         JOIN cohorts ON cohorts.id = students.cohort_id
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

  async getStudent(studentId: string) {
    const student = await this.findStudentById(studentId);
    return { data: this.toResponse(student, true) };
  }

  async createStudent(body: CreateStudentDto) {
    this.assertDateRange(body.enrolledOn, body.completedOn);

    const pool = this.databaseService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await this.assertCohortExists(client, body.cohortId);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (
           login_id,
           name,
           email,
           password_hash,
           role,
           status
         )
         VALUES ($1, $2, $3, $4, 'student', $5)
         RETURNING id`,
        [
          body.loginId,
          body.name,
          body.email ?? null,
          passwordHash,
          body.status === 'inactive' ? 'inactive' : 'active',
        ],
      );

      const userId = userResult.rows[0].id;

      const studentResult = await client.query<StudentRow>(
        `${this.insertStudentSql()}
         RETURNING
           students.id,
           students.user_id,
           (SELECT name FROM users WHERE users.id = students.user_id) AS name,
           (SELECT login_id FROM users WHERE users.id = students.user_id) AS login_id,
           (SELECT email FROM users WHERE users.id = students.user_id) AS email,
           students.phone,
           students.cohort_id,
           (SELECT name FROM cohorts WHERE cohorts.id = students.cohort_id) AS cohort_name,
           students.student_no,
           students.status,
           students.enrolled_on::text AS enrolled_on,
           students.completed_on::text AS completed_on,
           students.memo,
           students.created_at,
           students.updated_at`,
        [
          userId,
          body.cohortId,
          body.phone ?? null,
          body.studentNo ?? null,
          body.status ?? 'active',
          body.enrolledOn,
          body.completedOn ?? null,
          body.memo ?? null,
        ],
      );

      await client.query('COMMIT');
      return { data: this.toResponse(studentResult.rows[0], true) };
    } catch (error) {
      await client.query('ROLLBACK');
      this.handleWriteError(error);
    } finally {
      client.release();
    }
  }

  async updateStudent(studentId: string, body: UpdateStudentDto) {
    const current = await this.findStudentById(studentId);
    const enrolledOn = body.enrolledOn ?? current.enrolled_on;
    const completedOn = body.completedOn === undefined ? current.completed_on : body.completedOn;

    this.assertDateRange(enrolledOn, completedOn);

    const pool = this.databaseService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (body.cohortId) {
        await this.assertCohortExists(client, body.cohortId);
      }

      if (
        body.name !== undefined ||
        body.loginId !== undefined ||
        body.email !== undefined ||
        body.status !== undefined
      ) {
        await client.query(
          `UPDATE users
           SET
             name = COALESCE($2, name),
             login_id = COALESCE($3, login_id),
             email = $4,
             status = COALESCE($5, status),
             updated_at = now()
           WHERE id = $1
             AND deleted_at IS NULL`,
          [
            current.user_id,
            body.name ?? null,
            body.loginId ?? null,
            body.email === undefined ? current.email : body.email,
            body.status === undefined
              ? null
              : body.status === 'inactive'
                ? 'inactive'
                : 'active',
          ],
        );
      }

      const studentResult = await client.query<StudentRow>(
        `UPDATE students
         SET
           cohort_id = COALESCE($2, cohort_id),
           phone = $3,
           student_no = $4,
           status = COALESCE($5, status),
           enrolled_on = COALESCE($6, enrolled_on),
           completed_on = $7,
           memo = $8,
           updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING
           students.id,
           students.user_id,
           (SELECT name FROM users WHERE users.id = students.user_id) AS name,
           (SELECT login_id FROM users WHERE users.id = students.user_id) AS login_id,
           (SELECT email FROM users WHERE users.id = students.user_id) AS email,
           students.phone,
           students.cohort_id,
           (SELECT name FROM cohorts WHERE cohorts.id = students.cohort_id) AS cohort_name,
           students.student_no,
           students.status,
           students.enrolled_on::text AS enrolled_on,
           students.completed_on::text AS completed_on,
           students.memo,
           students.created_at,
           students.updated_at`,
        [
          studentId,
          body.cohortId ?? null,
          body.phone === undefined ? current.phone : body.phone,
          body.studentNo === undefined ? current.student_no : body.studentNo,
          body.status ?? null,
          body.enrolledOn ?? null,
          completedOn,
          body.memo === undefined ? current.memo : body.memo,
        ],
      );

      await client.query('COMMIT');
      return { data: this.toResponse(studentResult.rows[0], true) };
    } catch (error) {
      await client.query('ROLLBACK');
      this.handleWriteError(error);
    } finally {
      client.release();
    }
  }

  async deleteStudent(studentId: string): Promise<void> {
    const student = await this.findStudentById(studentId);
    const result = await this.databaseService.getPool().query(
      `WITH deleted_student AS (
         UPDATE students
         SET deleted_at = now(),
             updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING user_id
       )
       UPDATE users
       SET deleted_at = now(),
           updated_at = now()
       WHERE id = (SELECT user_id FROM deleted_student)
         AND deleted_at IS NULL`,
      [student.id],
    );

    if (result.rowCount === 0) {
      throw this.notFound();
    }
  }

  private baseSelectSql(): string {
    return `SELECT
      students.id,
      students.user_id,
      users.name,
      users.login_id,
      users.email,
      students.phone,
      students.cohort_id,
      cohorts.name AS cohort_name,
      students.student_no,
      students.status,
      students.enrolled_on::text AS enrolled_on,
      students.completed_on::text AS completed_on,
      students.memo,
      students.created_at,
      students.updated_at
    FROM students
    JOIN users ON users.id = students.user_id
    JOIN cohorts ON cohorts.id = students.cohort_id`;
  }

  private insertStudentSql(): string {
    return `INSERT INTO students (
      user_id,
      cohort_id,
      phone,
      student_no,
      status,
      enrolled_on,
      completed_on,
      memo
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
  }

  private async findStudentById(studentId: string): Promise<StudentRow> {
    const result = await this.databaseService.getPool().query<StudentRow>(
      `${this.baseSelectSql()}
       WHERE students.id = $1
         AND students.deleted_at IS NULL
         AND users.deleted_at IS NULL
         AND cohorts.deleted_at IS NULL
       LIMIT 1`,
      [studentId],
    );

    const student = result.rows[0];

    if (!student) {
      throw this.notFound();
    }

    return student;
  }

  private async assertCohortExists(client: PoolClient, cohortId: string): Promise<void> {
    const result = await client.query(
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

  private toResponse(row: StudentRow, includeMemo = false): StudentResponse {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      loginId: row.login_id,
      email: row.email,
      phone: row.phone,
      cohort: {
        id: row.cohort_id,
        name: row.cohort_name,
      },
      cohortId: row.cohort_id,
      studentNo: row.student_no,
      status: row.status,
      enrolledOn: this.toDateString(row.enrolled_on) ?? '',
      completedOn: this.toDateString(row.completed_on),
      ...(includeMemo ? { memo: row.memo } : {}),
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
    enrolledOn: string | Date | null | undefined,
    completedOn?: string | Date | null,
  ): void {
    const normalizedEnrolledOn = this.toDateString(enrolledOn);
    const normalizedCompletedOn = this.toDateString(completedOn);

    if (
      normalizedEnrolledOn &&
      normalizedCompletedOn &&
      normalizedCompletedOn < normalizedEnrolledOn
    ) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_DATE_RANGE',
          message: '수료일은 등록일보다 빠를 수 없습니다.',
          details: [],
        },
      });
    }
  }

  private handleWriteError(error: unknown): never {
    const dbError = error as DbError;

    if (dbError.code === '23505') {
      throw new ConflictException({
        error: {
          code: 'STUDENT_ALREADY_EXISTS',
          message: '이미 사용 중인 학생 계정 또는 학번입니다.',
          details: [],
        },
      });
    }

    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'STUDENT_NOT_FOUND',
        message: '학생을 찾을 수 없습니다.',
        details: [],
      },
    });
  }
}
