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

export type Workbook = {
  id: string;
  cohortId: string;
  title: string;
  subject: string;
  chapterCount: number;
  questionCount: number;
  status: WorkbookStatus;
  correctRate?: number;
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
