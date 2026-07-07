export type DashboardSummaryRow = {
  total_students: string;
  total_cohorts: string;
  total_workbooks: string;
  average_score: string;
};

export type RecentAssignmentRow = {
  assignment_id: string;
  workbook_id: string;
  workbook_title: string;
  cohort_id: string;
  cohort_name: string;
  status: 'scheduled' | 'open' | 'closed';
  question_count: string;
  submission_count: string;
  closes_at: Date | null;
  assigned_at: Date;
};

export type RecentSubmissionRow = {
  submission_id: string;
  assignment_id: string;
  workbook_id: string;
  workbook_title: string;
  student_id: string;
  student_name: string;
  cohort_id: string;
  cohort_name: string;
  attempt_no: number;
  status: 'submitted' | 'graded';
  score: string;
  submitted_at: Date;
};
