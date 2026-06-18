export type Role = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive';
export type CohortStatus = 'planned' | 'active' | 'completed';
export type StudentStatus = 'active' | 'inactive' | 'graduated';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type AssignmentStatus = 'active' | 'closed';
export type SubmissionStatus = 'in_progress' | 'submitted';

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Teacher = {
  id: string;
  userId: string;
  phone?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Cohort = {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  status: CohortStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Student = {
  id: string;
  userId: string;
  cohortId: string;
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  studentNo?: string;
  status: StudentStatus;
  enrolledAt: string;
  enrolledOn?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Question = {
  id: string;
  createdBy: string;
  subject: string;
  category?: string;
  difficulty: Difficulty;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Workbook = {
  id: string;
  createdBy: string;
  title: string;
  description?: string;
  status: ContentStatus;
  timeLimitMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type WorkbookQuestion = {
  id: string;
  workbookId: string;
  questionId: string;
  orderIndex: number;
  score: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkbookAssignment = {
  id: string;
  workbookId: string;
  cohortId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type Submission = {
  id: string;
  studentId: string;
  workbookId: string;
  startedAt: string;
  submittedAt?: string | null;
  score: number;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionAnswer = {
  id: string;
  submissionId: string;
  questionId: string;
  selectedAnswerIndex?: number | null;
  isCorrect: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
};
