import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsDto } from './dto/list-questions.dto';
import { QuestionChoiceDto } from './dto/question-choice.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  ChoiceRow,
  QuestionResponse,
  QuestionRow,
  QuestionType,
} from './question.types';

@Injectable()
export class QuestionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listQuestions(query: ListQuestionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [];
    const whereClauses = ['questions.deleted_at IS NULL'];
    const questionType = query.questionType ?? query.type;

    if (query.keyword?.trim()) {
      values.push(`%${query.keyword.trim()}%`);
      whereClauses.push(
        `(questions.content ILIKE $${values.length}
          OR questions.subject ILIKE $${values.length}
          OR questions.category ILIKE $${values.length})`,
      );
    }

    if (query.difficulty) {
      values.push(query.difficulty);
      whereClauses.push(`questions.difficulty = $${values.length}`);
    }

    if (questionType) {
      values.push(questionType);
      whereClauses.push(`questions.type = $${values.length}`);
    }

    if (query.subject?.trim()) {
      values.push(query.subject.trim());
      whereClauses.push(`questions.subject = $${values.length}`);
    }

    if (query.category?.trim()) {
      values.push(query.category.trim());
      whereClauses.push(`questions.category = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`questions.status = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<QuestionRow>(
        `${this.baseQuestionSelectSql()}
         WHERE ${whereSql}
         ORDER BY questions.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        dataValues,
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM questions
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    const choicesByQuestionId = await this.getChoicesByQuestionIds(
      dataResult.rows.map((question) => question.id),
    );

    return {
      data: dataResult.rows.map((row) =>
        this.toResponse(row, choicesByQuestionId.get(row.id) ?? []),
      ),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getQuestion(questionId: string) {
    const question = await this.findQuestionById(questionId);
    const choices = await this.getChoices(questionId);
    return { data: this.toResponse(question, choices) };
  }

  async createQuestion(body: CreateQuestionDto, createdBy?: string) {
    if (!createdBy) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    const content = this.resolveContent(body.content, body.stem);
    const questionType = this.resolveQuestionType(body.type, body.questionType);
    const answerIndex = this.resolveAnswerIndex(body.correctAnswerIndex, body.answerKey);
    this.assertAnswerIndex(answerIndex, body.choices.length);

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const questionResult = await client.query<QuestionRow>(
        `INSERT INTO questions (
           created_by,
           subject,
           category,
           difficulty,
           type,
           content,
           correct_answer_index,
           explanation,
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING
           id,
           created_by,
           subject,
           category,
           difficulty,
           type,
           content,
           correct_answer_index,
           explanation,
           status,
           created_at,
           updated_at`,
        [
          createdBy,
          body.subject,
          body.category ?? null,
          body.difficulty,
          questionType,
          content,
          answerIndex,
          body.explanation ?? null,
          body.status ?? 'draft',
        ],
      );

      const question = questionResult.rows[0];
      const choices = await this.replaceChoices(client, question.id, body.choices);

      await client.query('COMMIT');
      return { data: this.toResponse(question, choices) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateQuestion(questionId: string, body: UpdateQuestionDto) {
    const current = await this.findQuestionById(questionId);
    const nextChoiceCount = body.choices?.length ?? (await this.getChoices(questionId)).length;
    const nextAnswerIndex =
      body.correctAnswerIndex ?? body.answerKey ?? current.correct_answer_index;

    this.assertAnswerIndex(nextAnswerIndex, nextChoiceCount);

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const questionResult = await client.query<QuestionRow>(
        `UPDATE questions
         SET
           subject = COALESCE($2, subject),
           category = $3,
           difficulty = COALESCE($4, difficulty),
           type = COALESCE($5, type),
           content = COALESCE($6, content),
           correct_answer_index = COALESCE($7, correct_answer_index),
           explanation = $8,
           status = COALESCE($9, status),
           updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING
           id,
           created_by,
           subject,
           category,
           difficulty,
           type,
           content,
           correct_answer_index,
           explanation,
           status,
           created_at,
           updated_at`,
        [
          questionId,
          body.subject ?? null,
          body.category === undefined ? current.category : body.category,
          body.difficulty ?? null,
          body.type ?? body.questionType ?? null,
          this.optionalContent(body.content, body.stem),
          body.correctAnswerIndex ?? body.answerKey ?? null,
          body.explanation === undefined ? current.explanation : body.explanation,
          body.status ?? null,
        ],
      );

      const question = questionResult.rows[0];
      const choices = body.choices
        ? await this.replaceChoices(client, question.id, body.choices)
        : await this.getChoices(question.id, client);

      await client.query('COMMIT');
      return { data: this.toResponse(question, choices) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const result = await this.databaseService.getPool().query(
      `WITH deleted_question AS (
         UPDATE questions
         SET deleted_at = now(),
             updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL
         RETURNING id
       )
       UPDATE question_choices
       SET deleted_at = now(),
           updated_at = now()
       WHERE question_id = (SELECT id FROM deleted_question)
         AND deleted_at IS NULL`,
      [questionId],
    );

    if (result.rowCount === 0) {
      await this.findQuestionById(questionId);
    }
  }

  private baseQuestionSelectSql(): string {
    return `SELECT
      questions.id,
      questions.created_by,
      questions.subject,
      questions.category,
      questions.difficulty,
      questions.type,
      questions.content,
      questions.correct_answer_index,
      questions.explanation,
      questions.status,
      questions.created_at,
      questions.updated_at
    FROM questions`;
  }

  private async findQuestionById(questionId: string): Promise<QuestionRow> {
    const result = await this.databaseService.getPool().query<QuestionRow>(
      `${this.baseQuestionSelectSql()}
       WHERE questions.id = $1
         AND questions.deleted_at IS NULL
       LIMIT 1`,
      [questionId],
    );

    const question = result.rows[0];

    if (!question) {
      throw this.notFound();
    }

    return question;
  }

  private async replaceChoices(
    client: PoolClient,
    questionId: string,
    choices: Array<QuestionChoiceDto | string>,
  ): Promise<ChoiceRow[]> {
    await client.query(
      `UPDATE question_choices
       SET deleted_at = now(),
           updated_at = now()
       WHERE question_id = $1
         AND deleted_at IS NULL`,
      [questionId],
    );

    const insertedChoices: ChoiceRow[] = [];

    for (const [index, choice] of choices.entries()) {
      const text = this.resolveChoiceText(choice);
      const result = await client.query<ChoiceRow>(
        `INSERT INTO question_choices (
           question_id,
           choice_order,
           text
         )
         VALUES ($1, $2, $3)
         RETURNING
           id,
           question_id,
           choice_order,
           text`,
        [questionId, index, text],
      );

      insertedChoices.push(result.rows[0]);
    }

    return insertedChoices;
  }

  private async getChoices(questionId: string, client?: PoolClient): Promise<ChoiceRow[]> {
    const queryable = client ?? this.databaseService.getPool();
    const result = await queryable.query<ChoiceRow>(
      `SELECT
         id,
         question_id,
         choice_order,
         text
       FROM question_choices
       WHERE question_id = $1
         AND deleted_at IS NULL
       ORDER BY choice_order ASC`,
      [questionId],
    );

    return result.rows;
  }

  private async getChoicesByQuestionIds(questionIds: string[]): Promise<Map<string, ChoiceRow[]>> {
    const choicesByQuestionId = new Map<string, ChoiceRow[]>();

    if (questionIds.length === 0) {
      return choicesByQuestionId;
    }

    const result = await this.databaseService.getPool().query<ChoiceRow>(
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

  private toResponse(row: QuestionRow, choices: ChoiceRow[]): QuestionResponse {
    return {
      id: row.id,
      createdBy: row.created_by,
      subject: row.subject,
      category: row.category,
      difficulty: row.difficulty,
      type: row.type,
      content: row.content,
      choices: choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
      correctAnswerIndex: row.correct_answer_index,
      answerKey: row.correct_answer_index,
      explanation: row.explanation,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private resolveQuestionType(type?: QuestionType, questionType?: QuestionType): QuestionType {
    return type ?? questionType ?? 'multiple_choice';
  }

  private resolveContent(content?: string, stem?: string): string {
    const resolvedContent = content?.trim() || stem?.trim();

    if (!resolvedContent) {
      throw new UnprocessableEntityException({
        error: {
          code: 'QUESTION_CONTENT_REQUIRED',
          message: '문제 내용을 입력해야 합니다.',
          details: [],
        },
      });
    }

    return resolvedContent;
  }

  private optionalContent(content?: string, stem?: string): string | null {
    if (content === undefined && stem === undefined) {
      return null;
    }

    return this.resolveContent(content, stem);
  }

  private resolveAnswerIndex(correctAnswerIndex?: number, answerKey?: number): number {
    const resolvedAnswerIndex = correctAnswerIndex ?? answerKey;

    if (resolvedAnswerIndex === undefined) {
      throw new UnprocessableEntityException({
        error: {
          code: 'ANSWER_KEY_REQUIRED',
          message: '정답 인덱스를 입력해야 합니다.',
          details: [],
        },
      });
    }

    return resolvedAnswerIndex;
  }

  private assertAnswerIndex(answerIndex: number, choiceCount: number): void {
    if (answerIndex < 0 || answerIndex >= choiceCount) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_ANSWER_KEY',
          message: '정답 인덱스가 보기 범위를 벗어났습니다.',
          details: [],
        },
      });
    }
  }

  private resolveChoiceText(choice: QuestionChoiceDto | string): string {
    const text = typeof choice === 'string' ? choice : choice.text;
    const trimmedText = text?.trim();

    if (!trimmedText) {
      throw new UnprocessableEntityException({
        error: {
          code: 'QUESTION_CHOICE_REQUIRED',
          message: '보기 내용을 입력해야 합니다.',
          details: [],
        },
      });
    }

    return trimmedText;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'QUESTION_NOT_FOUND',
        message: '문제를 찾을 수 없습니다.',
        details: [],
      },
    });
  }
}
