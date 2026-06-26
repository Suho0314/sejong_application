import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  DashboardSummaryRow,
  RecentAssignmentRow,
  RecentSubmissionRow,
} from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDashboard() {
    const pool = this.databaseService.getPool();
    const [summaryResult, assignmentsResult, submissionsResult] = await Promise.all([
      pool.query<DashboardSummaryRow>(`
        SELECT
          (
            SELECT COUNT(*)
            FROM students
            JOIN users
              ON users.id = students.user_id
            LEFT JOIN cohorts
              ON cohorts.id = students.cohort_id
            WHERE students.deleted_at IS NULL
              AND users.deleted_at IS NULL
              AND (students.cohort_id IS NULL OR cohorts.deleted_at IS NULL)
          ) AS total_students,
          (
            SELECT COUNT(*)
            FROM cohorts
            WHERE cohorts.deleted_at IS NULL
          ) AS total_cohorts,
          (
            SELECT COUNT(*)
            FROM workbooks
            WHERE workbooks.deleted_at IS NULL
          ) AS total_workbooks,
          COALESCE((
            SELECT ROUND(AVG(submissions.score), 2)
            FROM submissions
            JOIN workbook_assignments
              ON workbook_assignments.id = submissions.workbook_assignment_id
             AND workbook_assignments.deleted_at IS NULL
            JOIN workbooks
              ON workbooks.id = submissions.workbook_id
             AND workbooks.deleted_at IS NULL
            JOIN students
              ON students.id = submissions.student_id
             AND students.deleted_at IS NULL
            JOIN users
              ON users.id = students.user_id
             AND users.deleted_at IS NULL
            JOIN cohorts
              ON cohorts.id = workbook_assignments.cohort_id
             AND cohorts.deleted_at IS NULL
            WHERE submissions.deleted_at IS NULL
              AND submissions.status = 'graded'
          ), 0) AS average_score
      `),
      pool.query<RecentAssignmentRow>(`
        SELECT
          workbook_assignments.id AS assignment_id,
          workbooks.id AS workbook_id,
          workbooks.title AS workbook_title,
          cohorts.id AS cohort_id,
          cohorts.name AS cohort_name,
          workbook_assignments.status,
          (
            SELECT COUNT(*)
            FROM workbook_questions
            JOIN questions
              ON questions.id = workbook_questions.question_id
             AND questions.deleted_at IS NULL
            WHERE workbook_questions.workbook_id = workbooks.id
              AND workbook_questions.deleted_at IS NULL
          ) AS question_count,
          (
            SELECT COUNT(*)
            FROM submissions
            JOIN students
              ON students.id = submissions.student_id
             AND students.deleted_at IS NULL
            JOIN users
              ON users.id = students.user_id
             AND users.deleted_at IS NULL
            WHERE submissions.workbook_assignment_id = workbook_assignments.id
              AND submissions.deleted_at IS NULL
              AND submissions.status IN ('submitted', 'graded')
          ) AS submission_count,
          workbook_assignments.closes_at,
          workbook_assignments.created_at AS assigned_at
        FROM workbook_assignments
        JOIN workbooks
          ON workbooks.id = workbook_assignments.workbook_id
         AND workbooks.deleted_at IS NULL
        JOIN cohorts
          ON cohorts.id = workbook_assignments.cohort_id
         AND cohorts.deleted_at IS NULL
        WHERE workbook_assignments.deleted_at IS NULL
        ORDER BY workbook_assignments.created_at DESC, workbook_assignments.id DESC
        LIMIT 5
      `),
      pool.query<RecentSubmissionRow>(`
        SELECT
          submissions.id AS submission_id,
          workbook_assignments.id AS assignment_id,
          workbooks.id AS workbook_id,
          workbooks.title AS workbook_title,
          students.id AS student_id,
          users.name AS student_name,
          cohorts.id AS cohort_id,
          cohorts.name AS cohort_name,
          submissions.attempt_no,
          submissions.status,
          submissions.score,
          submissions.submitted_at
        FROM submissions
        JOIN workbook_assignments
          ON workbook_assignments.id = submissions.workbook_assignment_id
         AND workbook_assignments.deleted_at IS NULL
        JOIN workbooks
          ON workbooks.id = submissions.workbook_id
         AND workbooks.deleted_at IS NULL
        JOIN students
          ON students.id = submissions.student_id
         AND students.deleted_at IS NULL
        JOIN users
          ON users.id = students.user_id
         AND users.deleted_at IS NULL
        JOIN cohorts
          ON cohorts.id = workbook_assignments.cohort_id
         AND cohorts.deleted_at IS NULL
        WHERE submissions.deleted_at IS NULL
          AND submissions.status IN ('submitted', 'graded')
          AND submissions.submitted_at IS NOT NULL
        ORDER BY submissions.submitted_at DESC, submissions.id DESC
        LIMIT 6
      `),
    ]);

    const summary = summaryResult.rows[0];

    return {
      data: {
        summary: {
          totalStudents: Number(summary?.total_students ?? 0),
          totalCohorts: Number(summary?.total_cohorts ?? 0),
          totalWorkbooks: Number(summary?.total_workbooks ?? 0),
          averageScore: Number(summary?.average_score ?? 0),
        },
        recentAssignments: assignmentsResult.rows.map((row) => ({
          assignmentId: row.assignment_id,
          workbookId: row.workbook_id,
          workbookTitle: row.workbook_title,
          cohortId: row.cohort_id,
          cohortName: row.cohort_name,
          status: row.status,
          questionCount: Number(row.question_count),
          submissionCount: Number(row.submission_count),
          closesAt: row.closes_at?.toISOString() ?? null,
          assignedAt: row.assigned_at.toISOString(),
        })),
        recentSubmissions: submissionsResult.rows.map((row) => ({
          submissionId: row.submission_id,
          assignmentId: row.assignment_id,
          workbookId: row.workbook_id,
          workbookTitle: row.workbook_title,
          studentId: row.student_id,
          studentName: row.student_name,
          cohortId: row.cohort_id,
          cohortName: row.cohort_name,
          attemptNo: row.attempt_no,
          status: row.status,
          score: Number(row.score),
          submittedAt: row.submitted_at.toISOString(),
        })),
      },
    };
  }
}
