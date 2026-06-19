export type Student = {
  id: string;
  name: string;
  loginId: string;
  cohortId: string;
};

export type Cohort = {
  id: string;
  name: string;
  courseName: string;
  period: string;
};

export type WorkbookStatus = 'notStarted' | 'inProgress' | 'completed';

export type Choice = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  content: string;
  choices: Choice[];
  answerIndex: number;
};

export type Workbook = {
  id: string;
  cohortId: string;
  title: string;
  description: string;
  subject: string;
  chapterCount: number;
  totalQuestions: number;
  estimatedMinutes: number;
  status: WorkbookStatus;
  correctRate?: number;
  questions: Question[];
};

export type StudentAnswer = {
  questionId: string;
  selectedChoiceId: string;
};

export type GradedAnswer = {
  questionId: string;
  questionContent: string;
  selectedChoiceId?: string;
  selectedChoiceText: string;
  correctChoiceId: string;
  correctChoiceText: string;
  isCorrect: boolean;
};

export type SubmissionResult = {
  workbookId: string;
  workbookTitle: string;
  cohortId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  score: number;
  gradedAnswers: GradedAnswer[];
};

export type WorkbookResult = {
  id: string;
  workbookId: string;
  solvedQuestionCount: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  submittedAt: string;
};

export type MainTab = 'workbooks' | 'wrongAnswers' | 'profile';
