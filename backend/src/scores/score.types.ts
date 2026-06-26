export type ScoreRow = {
  submission_id: string;
  assignment_id: string;
  workbook_id: string;
  workbook_title: string;
  cohort_id: string;
  cohort_name: string;
  student_id: string;
  student_name: string;
  student_no: string | null;
  attempt_no: number;
  status: 'in_progress' | 'submitted' | 'graded';
  score: string;
  total_points: number;
  earned_points: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  correct_rate: string;
  started_at: Date;
  submitted_at: Date | null;
  graded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type ScoreAnswerRow = {
  id: string;
  workbook_question_id: string;
  question_id: string;
  sequence: number;
  content: string;
  selected_choice_id: string | null;
  selected_choice_text: string | null;
  correct_choice_id: string | null;
  correct_choice_text: string | null;
  is_correct: boolean;
  earned_points: number;
  graded_at: Date | null;
};

export type ChoiceRow = {
  id: string;
  question_id: string;
  choice_order: number;
  text: string;
};

export type AverageSummaryRow = {
  submission_count: string;
  average_score: string | null;
  average_earned_points: string | null;
  average_total_points: string | null;
};

export type StudentSummaryRow = AverageSummaryRow & {
  student_id: string;
  student_name: string;
  student_no: string | null;
  cohort_id: string;
  cohort_name: string;
};

export type WorkbookSummaryRow = AverageSummaryRow & {
  workbook_id: string;
  workbook_title: string;
};

export type CohortSummaryRow = AverageSummaryRow & {
  cohort_id: string;
  cohort_name: string;
  student_count: string;
  submitted_student_count: string;
};

export type StudentProfileRow = {
  id: string;
};
