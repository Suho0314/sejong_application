import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ListStudentAssignmentsDto } from './dto/list-student-assignments.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import {
  AssignmentQuestionRow,
  ChoiceRow,
  GradedAnswerInput,
  StudentAssignmentRow,
  StudentProfileRow,
  SubmissionAnswerRow,
  SubmissionRow,
} from './submission.types';

@Injectable()
export class SubmissionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listStudentAssignments(query: ListStudentAssignmentsDto, userId?: string) {
    const student = await this.getStudentProfile(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [student.id, student.cohort_id];
    const countValues: Array<string | number> = [student.cohort_id];
    const whereClauses = [
      'workbook_assignments.deleted_at IS NULL',
      'workbooks.deleted_at IS NULL',
      'cohorts.deleted_at IS NULL',
      'workbook_assignments.cohort_id = $2',
    ];
    const countWhereClauses = [
      'workbook_assignments.deleted_at IS NULL',
      'workbooks.deleted_at IS NULL',
      'cohorts.deleted_at IS NULL',
      'workbook_assignments.cohort_id = $1',
    ];

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`workbook_assignments.status = $${values.length}`);
      countValues.push(query.status);
      countWhereClauses.push(`workbook_assignments.status = $${countValues.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const countWhereSql = countWhereClauses.join(' AND ');
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<StudentAssignmentRow>(
        `${this.studentAssignmentSelectSql()}
         WHERE ${whereSql}
         GROUP BY workbook_assignments.id, workbooks.id, cohorts.id
         ORDER BY workbook_assignments.opens_at DESC, workbook_assignments.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        [...values, limit, offset],
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM workbook_assignments
         JOIN workbooks ON workbooks.id = workbook_assignments.workbook_id
         JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
         WHERE ${countWhereSql}`,
        countValues,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toStudentAssignmentResponse(row)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async getStudentAssignment(assignmentId: string, userId?: string) {
    const student = await this.getStudentProfile(userId);
    const assignment = await this.findStudentAssignment(assignmentId, student.id, student.cohort_id);
    const [questions, choicesByQuestionId] = await this.getAssignmentQuestions(assignmentId);

    return {
      data: {
        ...this.toStudentAssignmentResponse(assignment),
        questions: questions.map((question) =>
          this.toAssignmentQuestionResponse(question, choicesByQuestionId.get(question.question_id) ?? []),
        ),
      },
    };
  }

  async createStudentSubmission(body: CreateSubmissionDto, userId?: string) {
    const student = await this.getStudentProfile(userId);
    const assignment = await this.findStudentAssignment(
      body.assignmentId,
      student.id,
      student.cohort_id,
    );

    this.assertSubmittable(assignment);

    const [questions, choicesByQuestionId] = await this.getAssignmentQuestions(body.assignmentId);

    if (questions.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'WORKBOOK_HAS_NO_QUESTIONS',
          message: '제출할 문제가 없습니다.',
          details: [],
        },
      });
    }

    const attemptNo = await this.getNextAttemptNo(body.assignmentId, student.id);

    if (attemptNo > assignment.max_attempts) {
      throw new ConflictException({
        error: {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: '최대 제출 횟수를 초과했습니다.',
          details: [],
        },
      });
    }

    const answersByWorkbookQuestionId = new Map(
      body.answers.map((answer) => [answer.workbookQuestionId, answer.selectedChoiceId ?? null]),
    );
    const gradedAnswers = this.gradeAnswers(questions, choicesByQuestionId, answersByWorkbookQuestionId);
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    const earnedPoints = gradedAnswers.reduce((sum, answer) => sum + answer.earnedPoints, 0);
    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;
    const totalQuestions = questions.length;
    const wrongCount = totalQuestions - correctCount;
    const score = totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
    const correctRate =
      totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;
    const now = new Date();
    const startedAt = body.startedAt ? new Date(body.startedAt) : now;

    const client = await this.databaseService.getPool().connect();

    try {
      await client.query('BEGIN');

      const submissionResult = await client.query<{ id: string }>(
        `INSERT INTO submissions (
           workbook_assignment_id,
           workbook_id,
           student_id,
           attempt_no,
           status,
           started_at,
           submitted_at,
           graded_at,
           total_points,
           earned_points,
           score,
           correct_count,
           wrong_count,
           total_questions,
           correct_rate
         )
         VALUES ($1, $2, $3, $4, 'graded', $5, $6, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          assignment.id,
          assignment.workbook_id,
          student.id,
          attemptNo,
          startedAt.toISOString(),
          now.toISOString(),
          totalPoints,
          earnedPoints,
          score,
          correctCount,
          wrongCount,
          totalQuestions,
          correctRate,
        ],
      );

      const submissionId = submissionResult.rows[0].id;
      await this.insertSubmissionAnswers(client, submissionId, gradedAnswers, now.toISOString());
      await this.closeActiveProgress(client, assignment.id, student.id);
      await client.query('COMMIT');

      return this.getStudentSubmission(submissionId, userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listStudentSubmissions(query: ListSubmissionsDto, userId?: string) {
    const student = await this.getStudentProfile(userId);
    return this.listSubmissions({ ...query, studentId: student.id }, student.id);
  }

  async getStudentSubmission(submissionId: string, userId?: string) {
    const student = await this.getStudentProfile(userId);
    const submission = await this.findSubmissionById(submissionId);

    if (submission.student_id !== student.id) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: '본인의 제출만 조회할 수 있습니다.',
          details: [],
        },
      });
    }

    return this.getSubmissionDetail(submission);
  }

  async listAdminSubmissions(query: ListSubmissionsDto) {
    return this.listSubmissions(query);
  }

  async getAdminSubmission(submissionId: string) {
    const submission = await this.findSubmissionById(submissionId);
    return this.getSubmissionDetail(submission);
  }

  private async listSubmissions(query: ListSubmissionsDto, forcedStudentId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const values: Array<string | number> = [];
    const whereClauses = [
      'submissions.deleted_at IS NULL',
      'workbook_assignments.deleted_at IS NULL',
      'workbooks.deleted_at IS NULL',
      'students.deleted_at IS NULL',
      'users.deleted_at IS NULL',
    ];

    if (query.assignmentId) {
      values.push(query.assignmentId);
      whereClauses.push(`submissions.workbook_assignment_id = $${values.length}`);
    }

    const studentId = forcedStudentId ?? query.studentId;
    if (studentId) {
      values.push(studentId);
      whereClauses.push(`submissions.student_id = $${values.length}`);
    }

    if (query.status) {
      values.push(query.status);
      whereClauses.push(`submissions.status = $${values.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const limitParam = values.length + 1;
    const offsetParam = values.length + 2;

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.getPool().query<SubmissionRow>(
        `${this.submissionSelectSql()}
         WHERE ${whereSql}
         ORDER BY submissions.submitted_at DESC NULLS LAST, submissions.created_at DESC
         LIMIT $${limitParam}
         OFFSET $${offsetParam}`,
        [...values, limit, offset],
      ),
      this.databaseService.getPool().query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM submissions
         JOIN workbook_assignments ON workbook_assignments.id = submissions.workbook_assignment_id
         JOIN workbooks ON workbooks.id = submissions.workbook_id
         JOIN students ON students.id = submissions.student_id
         JOIN users ON users.id = students.user_id
         WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      data: dataResult.rows.map((row) => this.toSubmissionListResponse(row)),
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  private async getSubmissionDetail(submission: SubmissionRow) {
    const answers = await this.getSubmissionAnswers(submission.id);
    const choicesByQuestionId = await this.getChoicesByQuestionIds(
      answers.map((answer) => answer.question_id),
    );

    return {
      data: {
        ...this.toSubmissionResponse(submission),
        answers: answers.map((answer) =>
          this.toSubmissionAnswerResponse(answer, choicesByQuestionId.get(answer.question_id) ?? []),
        ),
        gradedAnswers: answers.map((answer) =>
          this.toSubmissionAnswerResponse(answer, choicesByQuestionId.get(answer.question_id) ?? []),
        ),
      },
    };
  }

  private studentAssignmentSelectSql(): string {
    return `SELECT
      workbook_assignments.id,
      workbook_assignments.workbook_id,
      workbooks.title AS workbook_title,
      workbooks.description AS workbook_description,
      workbook_assignments.cohort_id,
      cohorts.name AS cohort_name,
      workbook_assignments.status,
      workbook_assignments.opens_at,
      workbook_assignments.closes_at,
      workbook_assignments.max_attempts,
      COUNT(DISTINCT workbook_questions.id) AS question_count,
      COUNT(DISTINCT submissions.id) FILTER (WHERE submissions.student_id = $1) AS submitted_count,
      MAX(submissions.score) FILTER (WHERE submissions.student_id = $1) AS latest_score,
      workbook_assignments.created_at,
      workbook_assignments.updated_at
    FROM workbook_assignments
    JOIN workbooks ON workbooks.id = workbook_assignments.workbook_id
    JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
    LEFT JOIN workbook_questions
      ON workbook_questions.workbook_id = workbooks.id
     AND workbook_questions.deleted_at IS NULL
    LEFT JOIN submissions
      ON submissions.workbook_assignment_id = workbook_assignments.id
     AND submissions.deleted_at IS NULL`;
  }

  private submissionSelectSql(): string {
    return `SELECT
      submissions.id,
      submissions.workbook_assignment_id,
      submissions.workbook_id,
      workbooks.title AS workbook_title,
      workbook_assignments.cohort_id,
      cohorts.name AS cohort_name,
      submissions.student_id,
      users.name AS student_name,
      students.student_no,
      submissions.attempt_no,
      submissions.status,
      submissions.started_at,
      submissions.submitted_at,
      submissions.graded_at,
      submissions.total_points,
      submissions.earned_points,
      submissions.score,
      submissions.correct_count,
      submissions.wrong_count,
      submissions.total_questions,
      submissions.correct_rate,
      submissions.created_at,
      submissions.updated_at
    FROM submissions
    JOIN workbook_assignments ON workbook_assignments.id = submissions.workbook_assignment_id
    JOIN workbooks ON workbooks.id = submissions.workbook_id
    JOIN cohorts ON cohorts.id = workbook_assignments.cohort_id
    JOIN students ON students.id = submissions.student_id
    JOIN users ON users.id = students.user_id`;
  }

  private async findStudentAssignment(
    assignmentId: string,
    studentId: string,
    cohortId: string,
  ): Promise<StudentAssignmentRow> {
    const result = await this.databaseService.getPool().query<StudentAssignmentRow>(
      `${this.studentAssignmentSelectSql()}
       WHERE workbook_assignments.id = $2
         AND workbook_assignments.cohort_id = $3
         AND workbook_assignments.deleted_at IS NULL
         AND workbooks.deleted_at IS NULL
         AND cohorts.deleted_at IS NULL
       GROUP BY workbook_assignments.id, workbooks.id, cohorts.id
       LIMIT 1`,
      [studentId, assignmentId, cohortId],
    );

    const assignment = result.rows[0];

    if (!assignment) {
      throw new NotFoundException({
        error: {
          code: 'ASSIGNMENT_NOT_FOUND',
          message: '배포된 문제집을 찾을 수 없습니다.',
          details: [],
        },
      });
    }

    return assignment;
  }

  private async findSubmissionById(submissionId: string): Promise<SubmissionRow> {
    const result = await this.databaseService.getPool().query<SubmissionRow>(
      `${this.submissionSelectSql()}
       WHERE submissions.id = $1
         AND submissions.deleted_at IS NULL
         AND workbook_assignments.deleted_at IS NULL
         AND workbooks.deleted_at IS NULL
         AND students.deleted_at IS NULL
         AND users.deleted_at IS NULL
       LIMIT 1`,
      [submissionId],
    );

    const submission = result.rows[0];

    if (!submission) {
      throw new NotFoundException({
        error: {
          code: 'SUBMISSION_NOT_FOUND',
          message: '제출 내역을 찾을 수 없습니다.',
          details: [],
        },
      });
    }

    return submission;
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
      `SELECT id, cohort_id
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

  private async getNextAttemptNo(assignmentId: string, studentId: string): Promise<number> {
    const result = await this.databaseService.getPool().query<{ next_attempt_no: string }>(
      `SELECT COALESCE(MAX(attempt_no), 0) + 1 AS next_attempt_no
       FROM submissions
       WHERE workbook_assignment_id = $1
         AND student_id = $2
         AND deleted_at IS NULL`,
      [assignmentId, studentId],
    );

    return Number(result.rows[0]?.next_attempt_no ?? 1);
  }

  private async getAssignmentQuestions(
    assignmentId: string,
  ): Promise<[AssignmentQuestionRow[], Map<string, ChoiceRow[]>]> {
    const questionsResult = await this.databaseService.getPool().query<AssignmentQuestionRow>(
      `SELECT
         workbook_questions.id AS workbook_question_id,
         questions.id AS question_id,
         workbook_questions.sequence,
         workbook_questions.points,
         workbook_questions.is_required,
         questions.content AS question_content,
         questions.type AS question_type,
         questions.subject,
         questions.category,
         questions.difficulty,
         questions.correct_answer_index
       FROM workbook_assignments
       JOIN workbook_questions
         ON workbook_questions.workbook_id = workbook_assignments.workbook_id
        AND workbook_questions.deleted_at IS NULL
       JOIN questions
         ON questions.id = workbook_questions.question_id
        AND questions.deleted_at IS NULL
       WHERE workbook_assignments.id = $1
         AND workbook_assignments.deleted_at IS NULL
       ORDER BY workbook_questions.sequence ASC`,
      [assignmentId],
    );

    const choicesByQuestionId = await this.getChoicesByQuestionIds(
      questionsResult.rows.map((question) => question.question_id),
    );

    return [questionsResult.rows, choicesByQuestionId];
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

  private async getSubmissionAnswers(submissionId: string): Promise<SubmissionAnswerRow[]> {
    const result = await this.databaseService.getPool().query<SubmissionAnswerRow>(
      `SELECT
         submission_answers.id,
         submission_answers.submission_id,
         submission_answers.workbook_question_id,
         submission_answers.question_id,
         workbook_questions.sequence,
         questions.content AS question_content,
         questions.type AS question_type,
         questions.subject,
         questions.category,
         questions.difficulty,
         submission_answers.selected_choice_id,
         submission_answers.correct_choice_id,
         selected_choices.text AS selected_choice_text,
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

  private gradeAnswers(
    questions: AssignmentQuestionRow[],
    choicesByQuestionId: Map<string, ChoiceRow[]>,
    answersByWorkbookQuestionId: Map<string, string | null>,
  ): GradedAnswerInput[] {
    return questions.map((question) => {
      const choices = choicesByQuestionId.get(question.question_id) ?? [];
      const correctChoice = choices.find(
        (choice) => choice.choice_order === question.correct_answer_index,
      );
      const selectedChoiceId = answersByWorkbookQuestionId.get(question.workbook_question_id) ?? null;
      const selectedChoice = selectedChoiceId
        ? choices.find((choice) => choice.id === selectedChoiceId)
        : undefined;
      const isCorrect = Boolean(
        selectedChoice && correctChoice && selectedChoice.id === correctChoice.id,
      );

      return {
        workbookQuestionId: question.workbook_question_id,
        questionId: question.question_id,
        selectedChoiceId: selectedChoice?.id ?? null,
        correctChoiceId: correctChoice?.id ?? null,
        isCorrect,
        earnedPoints: isCorrect ? question.points : 0,
      };
    });
  }

  private async insertSubmissionAnswers(
    client: PoolClient,
    submissionId: string,
    answers: GradedAnswerInput[],
    gradedAt: string,
  ): Promise<void> {
    for (const answer of answers) {
      await client.query(
        `INSERT INTO submission_answers (
           submission_id,
           workbook_question_id,
           question_id,
           selected_choice_id,
           correct_choice_id,
           is_correct,
           earned_points,
           graded_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          submissionId,
          answer.workbookQuestionId,
          answer.questionId,
          answer.selectedChoiceId,
          answer.correctChoiceId,
          answer.isCorrect,
          answer.earnedPoints,
          gradedAt,
        ],
      );
    }
  }

  private async closeActiveProgress(
    client: PoolClient,
    assignmentId: string,
    studentId: string,
  ): Promise<void> {
    await client.query(
      `UPDATE workbook_progresses
       SET learning_status = 'submitted',
           is_active = FALSE,
           updated_at = now()
       WHERE workbook_assignment_id = $1
         AND student_id = $2
         AND deleted_at IS NULL
         AND is_active = TRUE`,
      [assignmentId, studentId],
    );
  }

  private assertSubmittable(assignment: StudentAssignmentRow): void {
    const now = Date.now();
    const opensAt = assignment.opens_at.getTime();
    const closesAt = assignment.closes_at?.getTime();

    if (assignment.status !== 'open') {
      throw new ConflictException({
        error: {
          code: 'ASSIGNMENT_NOT_OPEN',
          message: '제출 가능한 상태가 아닙니다.',
          details: [],
        },
      });
    }

    if (now < opensAt || (closesAt && now > closesAt)) {
      throw new ConflictException({
        error: {
          code: 'ASSIGNMENT_NOT_IN_PERIOD',
          message: '제출 가능 기간이 아닙니다.',
          details: [],
        },
      });
    }
  }

  private toStudentAssignmentResponse(row: StudentAssignmentRow) {
    return {
      id: row.id,
      assignmentId: row.id,
      workbookId: row.workbook_id,
      workbookTitle: row.workbook_title,
      workbookDescription: row.workbook_description,
      cohortId: row.cohort_id,
      cohortName: row.cohort_name,
      status: row.status,
      opensAt: row.opens_at.toISOString(),
      closesAt: row.closes_at?.toISOString() ?? null,
      maxAttempts: row.max_attempts,
      questionCount: Number(row.question_count ?? 0),
      submittedCount: Number(row.submitted_count ?? 0),
      latestScore: row.latest_score === null ? null : Number(row.latest_score),
      learningStatus: Number(row.submitted_count ?? 0) > 0 ? 'submitted' : 'notStarted',
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toAssignmentQuestionResponse(question: AssignmentQuestionRow, choices: ChoiceRow[]) {
    return {
      workbookQuestionId: question.workbook_question_id,
      questionId: question.question_id,
      sequence: question.sequence,
      points: question.points,
      isRequired: question.is_required,
      type: question.question_type,
      content: question.question_content,
      subject: question.subject,
      category: question.category,
      difficulty: question.difficulty,
      choices: choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
    };
  }

  private toSubmissionListResponse(row: SubmissionRow) {
    return {
      id: row.id,
      assignmentId: row.workbook_assignment_id,
      workbookAssignmentId: row.workbook_assignment_id,
      workbookId: row.workbook_id,
      workbookTitle: row.workbook_title,
      cohortId: row.cohort_id,
      cohortName: row.cohort_name,
      studentId: row.student_id,
      studentName: row.student_name,
      studentNo: row.student_no,
      attemptNo: row.attempt_no,
      status: row.status,
      score: Number(row.score),
      earnedPoints: row.earned_points,
      totalPoints: row.total_points,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      totalQuestions: row.total_questions,
      correctRate: Number(row.correct_rate),
      submittedAt: row.submitted_at?.toISOString() ?? null,
    };
  }

  private toSubmissionResponse(row: SubmissionRow) {
    return {
      ...this.toSubmissionListResponse(row),
      startedAt: row.started_at.toISOString(),
      gradedAt: row.graded_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toSubmissionAnswerResponse(answer: SubmissionAnswerRow, choices: ChoiceRow[]) {
    return {
      id: answer.id,
      workbookQuestionId: answer.workbook_question_id,
      questionId: answer.question_id,
      sequence: answer.sequence,
      questionContent: answer.question_content,
      type: answer.question_type,
      subject: answer.subject,
      category: answer.category,
      difficulty: answer.difficulty,
      choices: choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
      })),
      selectedChoiceId: answer.selected_choice_id,
      selectedChoiceText: answer.selected_choice_text,
      correctChoiceId: answer.correct_choice_id,
      correctChoiceText: answer.correct_choice_text,
      isCorrect: answer.is_correct,
      earnedPoints: answer.earned_points,
      gradedAt: answer.graded_at?.toISOString() ?? null,
    };
  }
}
