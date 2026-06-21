export type WorkbookStatus = 'draft' | 'published' | 'archived';

export type WorkbookRow = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: WorkbookStatus;
  pass_score: number;
  question_count: string;
  created_at: Date;
  updated_at: Date;
};

export type WorkbookQuestionRow = {
  id: string;
  workbook_id: string;
  question_id: string;
  sequence: number;
  points: number;
  is_required: boolean;
  question_type?: 'multiple_choice';
  question_content?: string;
};

export type QuestionChoiceRow = {
  id: string;
  question_id: string;
  choice_order: number;
  text: string;
};

export type WorkbookAssignmentRow = {
  id: string;
  cohort_id: string;
  cohort_name: string;
  status: 'scheduled' | 'open' | 'closed';
};

export type WorkbookQuestionResponse = {
  id: string;
  questionId: string;
  sequence: number;
  points: number;
  isRequired: boolean;
  question?: {
    type: 'multiple_choice';
    content: string;
    choices: Array<{
      id: string;
      text: string;
    }>;
  };
};

export type WorkbookResponse = {
  id: string;
  createdByTeacherId?: string;
  title: string;
  description: string | null;
  status: WorkbookStatus;
  passScore: number;
  questionCount?: number;
  questions?: WorkbookQuestionResponse[];
  assignments?: Array<{
    id: string;
    cohortId: string;
    cohortName: string;
    status: 'scheduled' | 'open' | 'closed';
  }>;
  createdAt: string;
  updatedAt: string;
};
