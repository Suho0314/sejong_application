export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded';
export type AssignmentStatus = 'scheduled' | 'open' | 'closed';

export type StudentProfileRow = {
  id: string;
  cohort_id: string;
};

export type StudentAssignmentRow = {
  id: string;
  workbook_id: string;
  workbook_title: string;
  workbook_description: string | null;
  cohort_id: string;
  cohort_name: string;
  status: AssignmentStatus;
  opens_at: Date;
  closes_at: Date | null;
  max_attempts: number;
  question_count: string;
  submitted_count: string;
  latest_score: string | null;
  created_at: Date;
  updated_at: Date;
};

export type AssignmentQuestionRow = {
  workbook_question_id: string;
  question_id: string;
  sequence: number;
  points: number;
  is_required: boolean;
  question_content: string;
  question_type: 'multiple_choice';
  subject: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string | null;
  correct_answer_index: number;
};

export type ChoiceRow = {
  id: string;
  question_id: string;
  choice_order: number;
  text: string;
};

export type SubmissionRow = {
  id: string;
  workbook_assignment_id: string;
  workbook_id: string;
  workbook_title: string;
  cohort_id: string;
  cohort_name: string;
  student_id: string;
  student_name: string;
  student_no: string | null;
  attempt_no: number;
  status: SubmissionStatus;
  started_at: Date;
  submitted_at: Date | null;
  graded_at: Date | null;
  total_points: number;
  earned_points: number;
  score: string;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  correct_rate: string;
  created_at: Date;
  updated_at: Date;
};

export type SubmissionAnswerRow = {
  id: string;
  submission_id: string;
  workbook_question_id: string;
  question_id: string;
  sequence: number;
  question_content: string;
  question_type: 'multiple_choice';
  subject: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string | null;
  selected_choice_id: string | null;
  correct_choice_id: string | null;
  selected_choice_text: string | null;
  correct_choice_text: string | null;
  is_correct: boolean;
  earned_points: number;
  graded_at: Date | null;
};

export type GradedAnswerInput = {
  workbookQuestionId: string;
  questionId: string;
  selectedChoiceId: string | null;
  correctChoiceId: string | null;
  isCorrect: boolean;
  earnedPoints: number;
};

