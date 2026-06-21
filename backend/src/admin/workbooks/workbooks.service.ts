import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CreateWorkbookDto } from './dto/create-workbook.dto';
import { ListWorkbooksDto } from './dto/list-workbooks.dto';
import { UpdateWorkbookQuestionsDto } from './dto/update-workbook-questions.dto';
import { UpdateWorkbookDto } from './dto/update-workbook.dto';
import { WorkbookQuestionDto } from './dto/workbook-question.dto';
import {
  QuestionChoiceRow,
  WorkbookAssignmentRow,
  WorkbookQuestionResponse,
  WorkbookQuestionRow,
  WorkbookResponse,
  WorkbookRow,
} from './workbook.types';

type DbError = {
  code?: string;
};

@Injectable()
export class WorkbooksService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listWorkbooks(query: ListWorkbooksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [];
    const whereClauses = ['workbooks.deleted_at IS NULL'];

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`workbooks.status = $${values.length}`);
    }

    if (query.keyword?.trim()) {
      values.push(`%${query.keyword.trim()}%`);
      whereClauses.push(
        `(workbooks.title ILIKE $${values.length}
          OR workbooks.description ILIKE $${values.length})`,
      );
    }

    const whereSql = whereClauses.join(' AND ');
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<WorkbookRow>(
        `${this.baseWorkbookSelectSql()}
         WHERE ${whereSql}
         GROUP BY workbooks.id
         ORDER BY workbooks.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        dataValues,
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM workbooks
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toListResponse(row)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getWorkbook(workbookId: string) {
    const workbook = await this.findWorkbookById(workbookId);
    const [questions, assignments] = await Promise.all([
      this.getWorkbookQuestions(workbookId, true),
      this.getWorkbookAssignments(workbookId),
    ]);

    return { data: await this.toDetailResponse(workbook, questions, assignments) };
  }

  async createWorkbook(body: CreateWorkbookDto, createdBy?: string) {
    if (!createdBy) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const workbookResult = await client.query<WorkbookRow>(
        `INSERT INTO workbooks (
           created_by,
           title,
           description,
           status,
           pass_score
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING
           id,
           created_by,
           title,
           description,
           status,
           pass_score,
           0::bigint AS question_count,
           created_at,
           updated_at`,
        [
          createdBy,
          body.title,
          body.description ?? null,
          body.status ?? 'draft',
          body.passScore ?? 0,
        ],
      );

      const workbook = workbookResult.rows[0];
      const questions = await this.replaceWorkbookQuestions(
        client,
        workbook.id,
        body.questions ?? [],
      );

      await client.query('COMMIT');

      return {
        data: {
          ...(await this.toDetailResponse(
            { ...workbook, question_count: String(questions.length) },
            questions,
            [],
          )),
          createdByTeacherId: workbook.created_by,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.handleWriteError(error);
    } finally {
      client.release();
    }
  }

  async updateWorkbook(workbookId: string, body: UpdateWorkbookDto) {
    await this.findWorkbookById(workbookId);

    try {
      const result = await this.databaseService.getPool().query<WorkbookRow>(
        `UPDATE workbooks
         SET
           title = COALESCE($2, title),
           description = $3,
           status = COALESCE($4, status),
           pass_score = COALESCE($5, pass_score),
           updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING
           id,
           created_by,
           title,
           description,
           status,
           pass_score,
           (
             SELECT COUNT(*)
             FROM workbook_questions
             WHERE workbook_questions.workbook_id = workbooks.id
               AND workbook_questions.deleted_at IS NULL
           ) AS question_count,
           created_at,
           updated_at`,
        [
          workbookId,
          body.title ?? null,
          body.description === undefined ? (await this.findWorkbookById(workbookId)).description : body.description,
          body.status ?? null,
          body.passScore ?? null,
        ],
      );

      return { data: this.toListResponse(result.rows[0]) };
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateWorkbookQuestions(workbookId: string, body: UpdateWorkbookQuestionsDto) {
    await this.findWorkbookById(workbookId);

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');
      const questions = await this.replaceWorkbookQuestions(client, workbookId, body.questions);
      const workbookResult = await client.query<{ updated_at: Date }>(
        `UPDATE workbooks
         SET updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING updated_at`,
        [workbookId],
      );

      await client.query('COMMIT');

      return {
        data: {
          workbookId,
          questions: questions.map((question) => this.toWorkbookQuestionResponse(question)),
          updatedAt: workbookResult.rows[0].updated_at.toISOString(),
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.handleWriteError(error);
    } finally {
      client.release();
    }
  }

  async deleteWorkbook(workbookId: string): Promise<void> {
    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<{ id: string }>(
        `UPDATE workbooks
         SET deleted_at = now(),
             updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING id`,
        [workbookId],
      );

      if (result.rowCount === 0) {
        throw this.notFound();
      }

      await client.query(
        `UPDATE workbook_questions
         SET deleted_at = now(),
             updated_at = now()
         WHERE workbook_id = $1
           AND deleted_at IS NULL`,
        [workbookId],
      );

      await client.query(
        `UPDATE workbook_assignments
         SET deleted_at = now(),
             updated_at = now()
         WHERE workbook_id = $1
           AND deleted_at IS NULL`,
        [workbookId],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private baseWorkbookSelectSql(): string {
    return `SELECT
      workbooks.id,
      workbooks.created_by,
      workbooks.title,
      workbooks.description,
      workbooks.status,
      workbooks.pass_score,
      COUNT(workbook_questions.id) AS question_count,
      workbooks.created_at,
      workbooks.updated_at
    FROM workbooks
    LEFT JOIN workbook_questions
      ON workbook_questions.workbook_id = workbooks.id
     AND workbook_questions.deleted_at IS NULL`;
  }

  private async findWorkbookById(workbookId: string): Promise<WorkbookRow> {
    const result = await this.databaseService.getPool().query<WorkbookRow>(
      `${this.baseWorkbookSelectSql()}
       WHERE workbooks.id = $1
         AND workbooks.deleted_at IS NULL
       GROUP BY workbooks.id
       LIMIT 1`,
      [workbookId],
    );

    const workbook = result.rows[0];

    if (!workbook) {
      throw this.notFound();
    }

    return workbook;
  }

  private async replaceWorkbookQuestions(
    client: PoolClient,
    workbookId: string,
    questions: WorkbookQuestionDto[],
  ): Promise<WorkbookQuestionRow[]> {
    this.assertUniqueQuestionConfig(questions);
    await this.assertQuestionsExist(client, questions.map((question) => question.questionId));

    await client.query(
      `UPDATE workbook_questions
       SET deleted_at = now(),
           updated_at = now()
       WHERE workbook_id = $1
         AND deleted_at IS NULL`,
      [workbookId],
    );

    const insertedRows: WorkbookQuestionRow[] = [];

    for (const question of questions) {
      const result = await client.query<WorkbookQuestionRow>(
        `INSERT INTO workbook_questions (
           workbook_id,
           question_id,
           sequence,
           points,
           is_required
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING
           id,
           workbook_id,
           question_id,
           sequence,
           points,
           is_required`,
        [
          workbookId,
          question.questionId,
          question.sequence,
          question.points ?? 0,
          question.isRequired ?? true,
        ],
      );

      insertedRows.push(result.rows[0]);
    }

    return insertedRows.sort((a, b) => a.sequence - b.sequence);
  }

  private async assertQuestionsExist(client: PoolClient, questionIds: string[]): Promise<void> {
    if (questionIds.length === 0) {
      return;
    }

    const result = await client.query<{ id: string }>(
      `SELECT id
       FROM questions
       WHERE id = ANY($1::uuid[])
         AND deleted_at IS NULL`,
      [questionIds],
    );

    if (result.rowCount !== new Set(questionIds).size) {
      throw new NotFoundException({
        error: {
          code: 'QUESTION_NOT_FOUND',
          message: '문제를 찾을 수 없습니다.',
          details: [],
        },
      });
    }
  }

  private assertUniqueQuestionConfig(questions: WorkbookQuestionDto[]): void {
    const questionIds = new Set<string>();
    const sequences = new Set<number>();

    for (const question of questions) {
      if (questionIds.has(question.questionId)) {
        throw this.invalidQuestionConfig('같은 문제를 중복으로 추가할 수 없습니다.');
      }

      if (sequences.has(question.sequence)) {
        throw this.invalidQuestionConfig('문제 순서는 중복될 수 없습니다.');
      }

      questionIds.add(question.questionId);
      sequences.add(question.sequence);
    }
  }

  private invalidQuestionConfig(message: string): UnprocessableEntityException {
    return new UnprocessableEntityException({
      error: {
        code: 'INVALID_WORKBOOK_QUESTIONS',
        message,
        details: [],
      },
    });
  }

  private async getWorkbookQuestions(
    workbookId: string,
    includeQuestion = false,
  ): Promise<WorkbookQuestionRow[]> {
    const result = await this.databaseService.getPool().query<WorkbookQuestionRow>(
      `SELECT
         workbook_questions.id,
         workbook_questions.workbook_id,
         workbook_questions.question_id,
         workbook_questions.sequence,
         workbook_questions.points,
         workbook_questions.is_required,
         questions.type AS question_type,
         questions.content AS question_content
       FROM workbook_questions
       ${includeQuestion ? 'JOIN questions ON questions.id = workbook_questions.question_id AND questions.deleted_at IS NULL' : 'LEFT JOIN questions ON questions.id = workbook_questions.question_id AND questions.deleted_at IS NULL'}
       WHERE workbook_questions.workbook_id = $1
         AND workbook_questions.deleted_at IS NULL
       ORDER BY workbook_questions.sequence ASC`,
      [workbookId],
    );

    return result.rows;
  }

  private async getQuestionChoices(questionIds: string[]): Promise<Map<string, QuestionChoiceRow[]>> {
    const choicesByQuestionId = new Map<string, QuestionChoiceRow[]>();

    if (questionIds.length === 0) {
      return choicesByQuestionId;
    }

    const result = await this.databaseService.getPool().query<QuestionChoiceRow>(
      `SELECT
         id,
         question_id,
         choice_order,
         text
       FROM question_choices
       WHERE question_id = ANY($1::uuid[])
         AND deleted_at IS NULL
       ORDER BY question_id ASC, choice_order ASC`,
      [questionIds],
    );

    for (const choice of result.rows) {
      const choices = choicesByQuestionId.get(choice.question_id) ?? [];
      choices.push(choice);
      choicesByQuestionId.set(choice.question_id, choices);
    }

    return choicesByQuestionId;
  }

  private async getWorkbookAssignments(workbookId: string): Promise<WorkbookAssignmentRow[]> {
    const result = await this.databaseService.getPool().query<WorkbookAssignmentRow>(
      `SELECT
         workbook_assignments.id,
         workbook_assignments.cohort_id,
         cohorts.name AS cohort_name,
         workbook_assignments.status
       FROM workbook_assignments
       JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
        AND cohorts.deleted_at IS NULL
       WHERE workbook_assignments.workbook_id = $1
         AND workbook_assignments.deleted_at IS NULL
       ORDER BY workbook_assignments.created_at DESC`,
      [workbookId],
    );

    return result.rows;
  }

  private toListResponse(row: WorkbookRow): WorkbookResponse {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      passScore: row.pass_score,
      questionCount: Number(row.question_count),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private async toDetailResponse(
    row: WorkbookRow,
    questions: WorkbookQuestionRow[],
    assignments: WorkbookAssignmentRow[],
  ): Promise<WorkbookResponse> {
    const choicesByQuestionId = await this.getQuestionChoices(
      questions.map((question) => question.question_id),
    );

    return {
      ...this.toListResponse(row),
      questions: questions.map((question) =>
        this.toWorkbookQuestionResponse(
          question,
          choicesByQuestionId.get(question.question_id) ?? [],
        ),
      ),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        cohortId: assignment.cohort_id,
        cohortName: assignment.cohort_name,
        status: assignment.status,
      })),
    };
  }

  private toWorkbookQuestionResponse(
    row: WorkbookQuestionRow,
    choices: QuestionChoiceRow[] = [],
  ): WorkbookQuestionResponse {
    return {
      id: row.id,
      questionId: row.question_id,
      sequence: row.sequence,
      points: row.points,
      isRequired: row.is_required,
      ...(row.question_type && row.question_content
        ? {
            question: {
              type: row.question_type,
              content: row.question_content,
              choices: choices.map((choice) => ({
                id: choice.id,
                text: choice.text,
              })),
            },
          }
        : {}),
    };
  }

  private handleWriteError(error: unknown): never {
    const dbError = error as DbError;

    if (dbError.code === '23505') {
      throw new ConflictException({
        error: {
          code: 'WORKBOOK_QUESTION_CONFLICT',
          message: '문제집 문항 구성이 중복되었습니다.',
          details: [],
        },
      });
    }

    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'WORKBOOK_NOT_FOUND',
        message: '문제집을 찾을 수 없습니다.',
        details: [],
      },
    });
  }
}
