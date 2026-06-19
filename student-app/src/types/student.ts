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
