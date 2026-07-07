import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { BulkUpdateQuestionCategoryDto } from './dto/bulk-update-question-category.dto';
import { BulkUpdateQuestionStatusDto } from './dto/bulk-update-question-status.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionFilterOptionsDto } from './dto/list-question-filter-options.dto';
import { ListQuestionsDto } from './dto/list-questions.dto';
import { QuestionChoiceDto } from './dto/question-choice.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  ChoiceRow,
  QuestionResponse,
  QuestionRow,
  QuestionStatus,
  QuestionType,
} from './question.types';

const FIXED_CHOICE_COUNT = 5;
const DEFAULT_DIFFICULTY = 'medium' as const;
const TAXONOMY_WHITESPACE_PATTERN = /\s+/g;

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

    const subjectFilter = this.normalizeOptionalTaxonomyValue(query.subject);
    if (subjectFilter) {
      values.push(subjectFilter);
      whereClauses.push(
        `regexp_replace(questions.subject, '[[:space:]]+', '', 'g') = $${values.length}`,
      );
    }

    const categoryFilter = this.normalizeOptionalTaxonomyValue(query.category);
    if (categoryFilter) {
      values.push(categoryFilter);
      whereClauses.push(
        `regexp_replace(questions.category, '[[:space:]]+', '', 'g') = $${values.length}`,
      );
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`questions.status = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const orderSql = this.resolveListOrderSql(query);
    const dataValues = [...values, limit, offset];
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<QuestionRow>(
        `SELECT *
         FROM (
           ${this.baseQuestionSelectSql()}
           WHERE ${whereSql}
         ) filtered_questions
         ORDER BY ${orderSql}
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

  private normalizeTaxonomyWhitespace(value: string): string {
    return value.replace(TAXONOMY_WHITESPACE_PATTERN, '');
  }

  private normalizeOptionalTaxonomyValue(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = this.normalizeTaxonomyWhitespace(value);
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeRequiredTaxonomyValue(
    value: string | null | undefined,
    code: string,
    message: string,
  ): string {
    const normalized = this.normalizeOptionalTaxonomyValue(value);

    if (!normalized) {
      throw new UnprocessableEntityException({
        error: {
          code,
          message,
          details: [],
        },
      });
    }

    return normalized;
  }

  private resolveListOrderSql(query: ListQuestionsDto): string {
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

    if (sortBy === 'wrongRate') {
      return `filtered_questions.wrong_rate ${direction}, filtered_questions.created_at DESC, filtered_questions.id DESC`;
    }

    return `filtered_questions.created_at ${direction}, filtered_questions.id DESC`;
  }

  async listCategories() {
    const result = await this.databaseService.getPool().query<{ category: string }>(
      `SELECT DISTINCT NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '') AS category
       FROM questions
       WHERE deleted_at IS NULL
         AND NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '') IS NOT NULL`,
    );

    return {
      data: result.rows
        .map((row) => row.category)
        .sort((left, right) => left.localeCompare(right, 'ko-KR')),
    };
  }

  async listFilterOptions(query: ListQuestionFilterOptionsDto = {}) {
    const values: string[] = [];
    const whereClauses = ['deleted_at IS NULL'];

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`status = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const [subjectsResult, categoriesResult] = await Promise.all([
      this.databaseService.getPool().query<{ subject: string }>(
        `SELECT DISTINCT NULLIF(regexp_replace(subject, '[[:space:]]+', '', 'g'), '') AS subject
         FROM questions
         WHERE ${whereSql}
           AND NULLIF(regexp_replace(subject, '[[:space:]]+', '', 'g'), '') IS NOT NULL`,
        values,
      ),
      this.databaseService.getPool().query<{ category: string }>(
        `SELECT DISTINCT NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '') AS category
         FROM questions
         WHERE ${whereSql}
           AND NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '') IS NOT NULL`,
        values,
      ),
    ]);

    return {
      data: {
        subjects: subjectsResult.rows
          .map((row) => row.subject)
          .sort((left, right) => left.localeCompare(right, 'ko-KR')),
        categories: categoriesResult.rows
          .map((row) => row.category)
          .sort((left, right) => left.localeCompare(right, 'ko-KR')),
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
    const subject = this.normalizeRequiredTaxonomyValue(
      body.subject,
      'QUESTION_SUBJECT_REQUIRED',
      '과목을 입력해주세요.',
    );
    const category = this.normalizeOptionalTaxonomyValue(body.category);
    const questionType = this.resolveQuestionType(body.type, body.questionType);
    const answerIndex = this.resolveAnswerIndex(body.correctAnswerIndex, body.answerKey);
    this.assertExactChoiceCount(body.choices.length);
    this.assertAnswerIndex(answerIndex, FIXED_CHOICE_COUNT);

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
           status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           id,
           created_by,
           subject,
           category,
           difficulty,
           type,
           content,
           correct_answer_index,
           status,
           created_at,
           updated_at`,
        [
          createdBy,
          subject,
          category,
          body.difficulty ?? DEFAULT_DIFFICULTY,
          questionType,
          content,
          answerIndex,
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
    const subject =
      body.subject === undefined
        ? null
        : this.normalizeRequiredTaxonomyValue(
            body.subject,
            'QUESTION_SUBJECT_REQUIRED',
            '과목을 입력해주세요.',
          );
    const category =
      body.category === undefined
        ? current.category
        : this.normalizeOptionalTaxonomyValue(body.category);
    const nextChoiceCount = body.choices?.length ?? (await this.getChoices(questionId)).length;
    const nextAnswerIndex =
      body.correctAnswerIndex ?? body.answerKey ?? current.correct_answer_index;

    if (body.choices) {
      this.assertExactChoiceCount(body.choices.length);
      this.assertAnswerIndex(nextAnswerIndex, FIXED_CHOICE_COUNT);
    } else {
      this.assertAnswerIndex(nextAnswerIndex, nextChoiceCount);
    }

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
           status = COALESCE($8, status),
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
           status,
           created_at,
           updated_at`,
        [
          questionId,
          subject,
          category,
          body.difficulty ?? null,
          body.type ?? body.questionType ?? null,
          this.optionalContent(body.content, body.stem),
          body.correctAnswerIndex ?? body.answerKey ?? null,
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

  async bulkUpdateQuestionCategory(body: BulkUpdateQuestionCategoryDto) {
    const uniqueQuestionIds = Array.from(new Set(body.questionIds));
    const category = this.normalizeRequiredTaxonomyValue(
      body.category,
      'QUESTION_CATEGORY_REQUIRED',
      '카테고리를 입력해주세요.',
    );

    if (uniqueQuestionIds.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'QUESTION_IDS_REQUIRED',
          message: '카테고리를 변경할 문제를 1개 이상 선택해주세요.',
          details: [],
        },
      });
    }

    if (uniqueQuestionIds.length !== body.questionIds.length) {
      throw new UnprocessableEntityException({
        error: {
          code: 'DUPLICATE_QUESTION_IDS',
          message: '중복된 문제 ID가 포함되어 있습니다.',
          details: [],
        },
      });
    }

    if (!category) {
      throw new UnprocessableEntityException({
        error: {
          code: 'QUESTION_CATEGORY_REQUIRED',
          message: '카테고리를 입력해주세요.',
          details: [],
        },
      });
    }

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const existingResult = await client.query<{ id: string }>(
        `SELECT id
         FROM questions
         WHERE id = ANY($1::uuid[])
           AND deleted_at IS NULL
         FOR UPDATE`,
        [uniqueQuestionIds],
      );
      const existingIds = new Set(existingResult.rows.map((row) => row.id));
      const missingIds = uniqueQuestionIds.filter((questionId) => !existingIds.has(questionId));

      if (missingIds.length > 0) {
        throw new UnprocessableEntityException({
          error: {
            code: 'QUESTION_BULK_CATEGORY_TARGET_NOT_FOUND',
            message: '존재하지 않거나 삭제된 문제가 포함되어 있습니다.',
            details: missingIds,
          },
        });
      }

      const updateResult = await client.query<{ id: string; category: string }>(
        `UPDATE questions
         SET category = $2,
             updated_at = now()
         WHERE id = ANY($1::uuid[])
           AND deleted_at IS NULL
         RETURNING id, category`,
        [uniqueQuestionIds, category],
      );

      if (updateResult.rowCount !== uniqueQuestionIds.length) {
        throw new UnprocessableEntityException({
          error: {
            code: 'QUESTION_BULK_CATEGORY_COUNT_MISMATCH',
            message: '선택한 문제 수와 변경된 문제 수가 일치하지 않습니다.',
            details: [],
          },
        });
      }

      await client.query('COMMIT');

      return {
        data: {
          updatedCount: updateResult.rowCount,
          category,
          questionIds: updateResult.rows.map((row) => row.id),
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkUpdateQuestionStatus(body: BulkUpdateQuestionStatusDto) {
    const uniqueQuestionIds = Array.from(new Set(body.questionIds));

    if (uniqueQuestionIds.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'QUESTION_IDS_REQUIRED',
          message: '상태를 변경할 문제를 1개 이상 선택해주세요.',
          details: [],
        },
      });
    }

    if (uniqueQuestionIds.length !== body.questionIds.length) {
      throw new UnprocessableEntityException({
        error: {
          code: 'DUPLICATE_QUESTION_IDS',
          message: '중복된 문제 ID가 포함되어 있습니다.',
          details: [],
        },
      });
    }

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const existingResult = await client.query<{ id: string }>(
        `SELECT id
         FROM questions
         WHERE id = ANY($1::uuid[])
           AND deleted_at IS NULL
         FOR UPDATE`,
        [uniqueQuestionIds],
      );
      const existingIds = new Set(existingResult.rows.map((row) => row.id));
      const missingIds = uniqueQuestionIds.filter((questionId) => !existingIds.has(questionId));

      if (missingIds.length > 0) {
        throw new UnprocessableEntityException({
          error: {
            code: 'QUESTION_BULK_UPDATE_TARGET_NOT_FOUND',
            message: '존재하지 않거나 삭제된 문제가 포함되어 있습니다.',
            details: missingIds,
          },
        });
      }

      const updateResult = await client.query<{ id: string; status: QuestionStatus }>(
        `UPDATE questions
         SET status = $2,
             updated_at = now()
         WHERE id = ANY($1::uuid[])
           AND deleted_at IS NULL
         RETURNING id, status`,
        [uniqueQuestionIds, body.status],
      );

      if (updateResult.rowCount !== uniqueQuestionIds.length) {
        throw new UnprocessableEntityException({
          error: {
            code: 'QUESTION_BULK_UPDATE_COUNT_MISMATCH',
            message: '선택한 문제 수와 변경된 문제 수가 일치하지 않습니다.',
            details: [],
          },
        });
      }

      await client.query('COMMIT');

      return {
        data: {
          updatedCount: updateResult.rowCount,
          status: body.status,
          questionIds: updateResult.rows.map((row) => row.id),
        },
      };
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
      questions.status,
      questions.created_at,
      questions.updated_at,
      COALESCE(question_answer_stats.answer_count, 0)::int AS answer_count,
      COALESCE(question_answer_stats.correct_count, 0)::int AS correct_count,
      COALESCE(question_answer_stats.wrong_count, 0)::int AS wrong_count,
      CASE
        WHEN COALESCE(question_answer_stats.answer_count, 0) = 0 THEN 0
        ELSE ROUND(
          (question_answer_stats.wrong_count::numeric / question_answer_stats.answer_count::numeric) * 100,
          1
        )::float
      END AS wrong_rate
    FROM questions
    LEFT JOIN (
      SELECT
        question_id,
        COUNT(*)::int AS answer_count,
        COUNT(*) FILTER (WHERE is_correct)::int AS correct_count,
        COUNT(*) FILTER (WHERE NOT is_correct)::int AS wrong_count
      FROM submission_answers
      WHERE deleted_at IS NULL
      GROUP BY question_id
    ) question_answer_stats ON question_answer_stats.question_id = questions.id`;
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
      answerCount: Number(row.answer_count ?? 0),
      correctCount: Number(row.correct_count ?? 0),
      wrongCount: Number(row.wrong_count ?? 0),
      wrongRate: Number(row.wrong_rate ?? 0),
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private resolveQuestionType(type?: QuestionType, questionType?: QuestionType): QuestionType {
    return type ?? questionType ?? 'multiple_choice';
  }

  private resolveContent(content?: string, stem?: string): string {
    const resolvedContent = this.normalizeMultilineText(content) || this.normalizeMultilineText(stem);

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

  private assertExactChoiceCount(choiceCount: number): void {
    if (choiceCount !== FIXED_CHOICE_COUNT) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_CHOICE_COUNT',
          message: '선택지는 정확히 5개를 입력해야 합니다.',
          details: [],
        },
      });
    }
  }

  private normalizeMultilineText(value?: string | null): string {
    return value?.replace(/\r\n/g, '\n').trim() ?? '';
  }

  private resolveChoiceText(choice: QuestionChoiceDto | string): string {
    const text = typeof choice === 'string' ? choice : choice.text;
    const trimmedText = this.normalizeMultilineText(text);

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
