export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice';
export type QuestionStatus = 'draft' | 'published' | 'archived';

export type QuestionChoice = {
  id: string;
  text: string;
};

export type QuestionRow = {
  id: string;
  created_by: string;
  subject: string;
  category: string | null;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  correct_answer_index: number;
  status: QuestionStatus;
  created_at: Date;
  updated_at: Date;
  answer_count?: number | string | null;
  correct_count?: number | string | null;
  wrong_count?: number | string | null;
  wrong_rate?: number | string | null;
};

export type ChoiceRow = {
  id: string;
  question_id: string;
  choice_order: number;
  text: string;
};

export type QuestionResponse = {
  id: string;
  createdBy: string;
  subject: string;
  category: string | null;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: QuestionChoice[];
  correctAnswerIndex: number;
  answerKey: number;
  answerCount: number;
  correctCount: number;
  wrongCount: number;
  wrongRate: number;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
};
