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

export type WorkbookStatus = 'notStarted' | 'inProgress' | 'retrying' | 'submitted';

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
  maxAttempts?: number;
  submittedCount?: number;
  correctRate?: number;
  questions: Question[];
};

export type StudentAnswer = {
  questionId: string;
  selectedChoiceId: string;
};

export type SolveProgressStatus = Exclude<WorkbookStatus, 'notStarted'>;

export type SolveProgress = {
  workbookId: string;
  currentQuestionIndex: number;
  answers: StudentAnswer[];
  status: SolveProgressStatus;
  updatedAt: string;
};

export type GradedAnswer = {
  questionId: string;
  questionContent: string;
  choices: Choice[];
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

export type SubmissionRecord = {
  id: string;
  submittedAt: string;
  result: SubmissionResult;
};

export type WrongAnswerHistoryGroup = {
  submissionId: string;
  workbookId: string;
  workbookTitle: string;
  latestSubmittedAt: string;
  latestScore: number;
  latestCorrectRate: number;
  wrongAnswers: GradedAnswer[];
};

export type StudentPerformanceSummary = {
  solvedWorkbookCount: number;
  totalQuestions: number;
  correctCount: number;
  correctRate: number;
};

export type MainTab = 'workbooks' | 'wrongAnswers' | 'profile';
