import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ListScoresDto } from './dto/list-scores.dto';
import {
  AverageSummaryRow,
  ChoiceRow,
  CohortSummaryRow,
  ScoreAnswerRow,
  ScoreRow,
  StudentProfileRow,
  StudentSummaryRow,
  WorkbookSummaryRow,
} from './score.types';

@Injectable()
export class ScoresService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listScores(query: ListScoresDto, forcedStudentId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const { whereSql, values } = this.buildScoreWhere(query, forcedStudentId);
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<ScoreRow>(
        `${this.scoreSelectSql()}
         WHERE ${whereSql}
         ORDER BY submissions.submitted_at DESC NULLS LAST, submissions.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        [...values, limit, offset],
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM ${this.scoreFromSql()}
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toScoreResponse(row)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getStudentScores(studentId: string, query: ListScoresDto) {
    const scopedQuery = { ...query, studentId };
    const [summary, scores] = await Promise.all([
      this.getStudentSummary(studentId, query),
      this.listScores(scopedQuery),
    ]);

    return {
      data: {
        summary,
        scores: scores.data,
      },
      meta: scores.meta,
    };
  }

  async getWorkbookScores(workbookId: string, query: ListScoresDto) {
    const scopedQuery = { ...query, workbookId };
    const [summary, scores] = await Promise.all([
      this.getWorkbookSummary(workbookId, query),
      this.listScores(scopedQuery),
    ]);

    return {
      data: {
        summary,
        scores: scores.data,
      },
      meta: scores.meta,
    };
  }

  async getCohortScores(cohortId: string, query: ListScoresDto) {
    const scopedQuery = { ...query, cohortId };
    const [summary, scores] = await Promise.all([
      this.getCohortSummary(cohortId, query),
      this.listScores(scopedQuery),
    ]);

    return {
      data: {
        summary,
        scores: scores.data,
      },
      meta: scores.meta,
    };
  }

  async listStudentScores(query: ListScoresDto, userId?: string) {
    const student = await this.getStudentProfile(userId);
    return this.listScores(query, student.id);
  }

  async getStudentScore(submissionId: string, userId?: string) {
    const student = await this.getStudentProfile(userId);
    const score = await this.findScoreBySubmissionId(submissionId);

    if (score.student_id !== student.id) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: '본인의 성적만 조회할 수 있습니다.',
          details: [],
        },
      });
    }

    return this.getScoreDetail(score);
  }

  private async getStudentSummary(studentId: string, query: ListScoresDto) {
    const summaryQuery = { ...query, studentId };
    const entityResult = await this.databaseService.getPool().query<
      Pick<StudentSummaryRow, 'student_id' | 'student_name' | 'student_no' | 'cohort_id' | 'cohort_name'>
    >(
      `SELECT
         students.id AS student_id,
         users.name AS student_name,
         students.student_no,
         cohorts.id AS cohort_id,
         cohorts.name AS cohort_name
       FROM students
       JOIN users ON users.id = students.user_id
       JOIN cohorts ON cohorts.id = students.cohort_id
       WHERE students.id = $1
         AND students.deleted_at IS NULL
         AND users.deleted_at IS NULL
         AND cohorts.deleted_at IS NULL
       LIMIT 1`,
      [studentId],
    );

    const row = entityResult.rows[0];

    if (!row) {
      throw this.notFound('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.');
    }

    const average = await this.getAverageSummary(summaryQuery);

    return {
      student: {
        id: row.student_id,
        name: row.student_name,
        studentNo: row.student_no,
      },
      cohort: {
        id: row.cohort_id,
        name: row.cohort_name,
      },
      ...this.toAverageSummary(average),
    };
  }

  private async getWorkbookSummary(workbookId: string, query: ListScoresDto) {
    const summaryQuery = { ...query, workbookId };
    const entityResult = await this.databaseService.getPool().query<
      Pick<WorkbookSummaryRow, 'workbook_id' | 'workbook_title'>
    >(
      `SELECT
         workbooks.id AS workbook_id,
         workbooks.title AS workbook_title
       FROM workbooks
       WHERE workbooks.id = $1
         AND workbooks.deleted_at IS NULL
       LIMIT 1`,
      [workbookId],
    );

    const row = entityResult.rows[0];

    if (!row) {
      throw this.notFound('WORKBOOK_NOT_FOUND', '문제집을 찾을 수 없습니다.');
    }

    const average = await this.getAverageSummary(summaryQuery);

    return {
      workbook: {
        id: row.workbook_id,
        title: row.workbook_title,
      },
      ...this.toAverageSummary(average),
    };
  }

  private async getCohortSummary(cohortId: string, query: ListScoresDto) {
    const summaryQuery = { ...query, cohortId };
    const entityResult = await this.databaseService.getPool().query<
      Pick<CohortSummaryRow, 'cohort_id' | 'cohort_name' | 'student_count'>
    >(
      `SELECT
         cohorts.id AS cohort_id,
         cohorts.name AS cohort_name,
         COUNT(DISTINCT students.id) AS student_count
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

    const row = entityResult.rows[0];

    if (!row) {
      throw this.notFound('COHORT_NOT_FOUND', '기수를 찾을 수 없습니다.');
    }

    const [average, submittedStudentCount] = await Promise.all([
      this.getAverageSummary(summaryQuery),
      this.getSubmittedStudentCount(summaryQuery),
    ]);

    return {
      cohort: {
        id: row.cohort_id,
        name: row.cohort_name,
      },
      studentCount: Number(row.student_count ?? 0),
      submittedStudentCount,
      ...this.toAverageSummary(average),
    };
  }

  private async getAverageSummary(query: ListScoresDto): Promise<AverageSummaryRow> {
    const { whereSql, values } = this.buildScoreWhere(query);
    const result = await this.databaseService.getPool().query<AverageSummaryRow>(
      `SELECT
         COUNT(submissions.id) AS submission_count,
         AVG(submissions.score) AS average_score,
         AVG(submissions.earned_points) AS average_earned_points,
         AVG(submissions.total_points) AS average_total_points
       FROM ${this.scoreFromSql()}
       WHERE ${whereSql}`,
      values,
    );

    return (
      result.rows[0] ?? {
        submission_count: '0',
        average_score: null,
        average_earned_points: null,
        average_total_points: null,
      }
    );
  }

  private async getSubmittedStudentCount(query: ListScoresDto): Promise<number> {
    const { whereSql, values } = this.buildScoreWhere(query);
    const result = await this.databaseService.getPool().query<{ total: string }>(
      `SELECT COUNT(DISTINCT submissions.student_id) AS total
       FROM ${this.scoreFromSql()}
       WHERE ${whereSql}`,
      values,
    );

    return Number(result.rows[0]?.total ?? 0);
  }

  private async findScoreBySubmissionId(submissionId: string): Promise<ScoreRow> {
    const result = await this.databaseService.getPool().query<ScoreRow>(
      `${this.scoreSelectSql()}
       WHERE submissions.id = $1
         AND submissions.deleted_at IS NULL
         AND workbook_assignments.deleted_at IS NULL
         AND workbooks.deleted_at IS NULL
         AND cohorts.deleted_at IS NULL
         AND students.deleted_at IS NULL
         AND users.deleted_at IS NULL
       LIMIT 1`,
      [submissionId],
    );

    const row = result.rows[0];

    if (!row) {
      throw this.notFound('SCORE_NOT_FOUND', '성적을 찾을 수 없습니다.');
    }

    return row;
  }

  private async getScoreDetail(score: ScoreRow) {
    const answers = await this.getScoreAnswers(score.submission_id);
    const choicesByQuestionId = await this.getChoicesByQuestionIds(
      answers.map((answer) => answer.question_id),
    );

    return {
      data: {
        ...this.toScoreResponse(score),
        answers: answers.map((answer) =>
          this.toAnswerResponse(answer, choicesByQuestionId.get(answer.question_id) ?? []),
        ),
      },
    };
  }

  private async getScoreAnswers(submissionId: string): Promise<ScoreAnswerRow[]> {
    const result = await this.databaseService.getPool().query<ScoreAnswerRow>(
      `SELECT
         submission_answers.id,
         submission_answers.workbook_question_id,
         submission_answers.question_id,
         workbook_questions.sequence,
         questions.content,
         submission_answers.selected_choice_id,
         selected_choices.text AS selected_choice_text,
         submission_answers.correct_choice_id,
         correct_choices.text AS correct_choice_text,
         submission_answers.is_correct,
         submission_answers.earned_points,
         submission_answers.graded_at
       FROM submission_answers
       JOIN workbook_questions ON workbook_questions.id = submission_answers.workbook_question_id
       JOIN questions ON questions.id = submission_answers.question_id
       LEFT JOIN question_choices selected_choices
         ON selected_choices.id = submission_answers.selected_choice_id
       LEFT JOIN question_choices correct_choices
         ON correct_choices.id = submission_answers.correct_choice_id
       WHERE submission_answers.submission_id = $1
         AND submission_answers.deleted_at IS NULL
       ORDER BY workbook_questions.sequence ASC`,
      [submissionId],
    );

    return result.rows;
  }

  private async getChoicesByQuestionIds(questionIds: string[]): Promise<Map<string, ChoiceRow[]>> {
    if (questionIds.length === 0) {
      return new Map();
    }

    const result = await this.databaseService.getPool().query<ChoiceRow>(
      `SELECT id, question_id, choice_order, text
       FROM question_choices
       WHERE question_id = ANY($1::uuid[])
         AND deleted_at IS NULL
       ORDER BY question_id ASC, choice_order ASC`,
      [questionIds],
    );

    return result.rows.reduce((map, choice) => {
      const choices = map.get(choice.question_id) ?? [];
      choices.push(choice);
      map.set(choice.question_id, choices);
      return map;
    }, new Map<string, ChoiceRow[]>());
  }

  private async getStudentProfile(userId?: string): Promise<StudentProfileRow> {
    if (!userId) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    const result = await this.databaseService.getPool().query<StudentProfileRow>(
      `SELECT id
       FROM students
       WHERE user_id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );

    const student = result.rows[0];

    if (!student) {
      throw new ForbiddenException({
        error: {
          code: 'STUDENT_PROFILE_NOT_FOUND',
          message: '학생 프로필을 찾을 수 없습니다.',
          details: [],
        },
      });
    }

    return student;
  }

  private buildScoreWhere(query: ListScoresDto, forcedStudentId?: string) {
    const values: Array<string | number> = [];
    const whereClauses = [
      'submissions.deleted_at IS NULL',
      'workbook_assignments.deleted_at IS NULL',
      'workbooks.deleted_at IS NULL',
      'cohorts.deleted_at IS NULL',
      'students.deleted_at IS NULL',
      'users.deleted_at IS NULL',
    ];

    const studentId = forcedStudentId ?? query.studentId;

    if (query.cohortId) {
      values.push(query.cohortId);
      whereClauses.push(`workbook_assignments.cohort_id = $${values.length}`);
    }

    if (studentId) {
      values.push(studentId);
      whereClauses.push(`submissions.student_id = $${values.length}`);
    }

    if (query.workbookId) {
      values.push(query.workbookId);
      whereClauses.push(`submissions.workbook_id = $${values.length}`);
    }

    if (query.assignmentId) {
      values.push(query.assignmentId);
      whereClauses.push(`submissions.workbook_assignment_id = $${values.length}`);
    }

    return {
      whereSql: whereClauses.join(' AND '),
      values,
    };
  }

  private scoreSelectSql(): string {
    return `SELECT
      submissions.id AS submission_id,
      submissions.workbook_assignment_id AS assignment_id,
      submissions.workbook_id,
      workbooks.title AS workbook_title,
      workbook_assignments.cohort_id,
      cohorts.name AS cohort_name,
      submissions.student_id,
      users.name AS student_name,
      students.student_no,
      submissions.attempt_no,
      submissions.status,
      submissions.score,
      submissions.total_points,
      submissions.earned_points,
      submissions.correct_count,
      submissions.wrong_count,
      submissions.total_questions,
      submissions.correct_rate,
      submissions.started_at,
      submissions.submitted_at,
      submissions.graded_at,
      submissions.created_at,
      submissions.updated_at
    FROM ${this.scoreFromSql()}`;
  }

  private scoreFromSql(): string {
    return `submissions
    JOIN workbook_assignments ON workbook_assignments.id = submissions.workbook_assignment_id
    JOIN workbooks ON workbooks.id = submissions.workbook_id
    JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
    JOIN students ON students.id = submissions.student_id
    JOIN users ON users.id = students.user_id`;
  }

  private toScoreResponse(row: ScoreRow) {
    return {
      submissionId: row.submission_id,
      assignmentId: row.assignment_id,
      workbook: {
        id: row.workbook_id,
        title: row.workbook_title,
      },
      cohort: {
        id: row.cohort_id,
        name: row.cohort_name,
      },
      student: {
        id: row.student_id,
        name: row.student_name,
        studentNo: row.student_no,
      },
      attemptNo: row.attempt_no,
      status: row.status,
      score: Number(row.score),
      totalPoints: row.total_points,
      earnedPoints: row.earned_points,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      totalQuestions: row.total_questions,
      correctRate: Number(row.correct_rate),
      startedAt: row.started_at.toISOString(),
      submittedAt: row.submitted_at?.toISOString() ?? null,
      gradedAt: row.graded_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toAnswerResponse(answer: ScoreAnswerRow, choices: ChoiceRow[]) {
    return {
      id: answer.id,
      workbookQuestionId: answer.workbook_question_id,
      questionId: answer.question_id,
      sequence: answer.sequence,
      content: answer.content,
      choices: choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
      selectedChoiceId: answer.selected_choice_id,
      selectedAnswer: answer.selected_choice_text,
      correctChoiceId: answer.correct_choice_id,
      correctAnswer: answer.correct_choice_text,
      isCorrect: answer.is_correct,
      earnedPoints: answer.earned_points,
      gradedAt: answer.graded_at?.toISOString() ?? null,
    };
  }

  private toAverageSummary(row: AverageSummaryRow) {
    return {
      submissionCount: Number(row.submission_count ?? 0),
      averageScore: this.toNullableNumber(row.average_score),
      averageEarnedPoints: this.toNullableNumber(row.average_earned_points),
      averageTotalPoints: this.toNullableNumber(row.average_total_points),
    };
  }

  private toNullableNumber(value: string | null): number | null {
    return value === null ? null : Number(Number(value).toFixed(2));
  }

  private notFound(code: string, message: string): NotFoundException {
    return new NotFoundException({
      error: {
        code,
        message,
        details: [],
      },
    });
  }
}
