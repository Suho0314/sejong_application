import { apiRequest } from './client';

export type StudentAssignmentQuestionApiItem = {
  workbookQuestionId: string;
  questionId: string;
  sequence: number;
  points: number;
  isRequired: boolean;
  type: 'multiple_choice';
  content: string;
  subject: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  choices: Array<{
    id: string;
    text: string;
  }>;
};

export type StudentAssignmentApiItem = {
  id: string;
  assignmentId: string;
  workbookId: string;
  workbookTitle: string;
  workbookDescription: string | null;
  cohortId: string;
  cohortName: string;
  status: 'scheduled' | 'open' | 'closed';
  opensAt: string;
  closesAt: string | null;
  maxAttempts: number;
  questionCount: number;
  submittedCount: number;
  latestScore: number | null;
  learningStatus: 'submitted' | 'notStarted';
  questions?: StudentAssignmentQuestionApiItem[];
  createdAt: string;
  updatedAt: string;
};

export type SubmissionAnswerApiItem = {
  id: string;
  workbookQuestionId: string;
  questionId: string;
  sequence: number;
  questionContent: string;
  type: 'multiple_choice';
  subject: string;
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  choices: Array<{
    id: string;
    text: string;
  }>;
  selectedChoiceId: string | null;
  selectedChoiceText: string | null;
  correctChoiceId: string | null;
  correctChoiceText: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  gradedAt: string | null;
};

export type StudentScoreAnswerApiItem = {
  id: string;
  workbookQuestionId: string;
  questionId: string;
  sequence: number;
  content: string;
  choices: Array<{
    id: string;
    text: string;
  }>;
  selectedChoiceId: string | null;
  selectedAnswer: string | null;
  correctChoiceId: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  gradedAt: string | null;
};

export type StudentSubmissionApiItem = {
  id: string;
  assignmentId: string;
  workbookAssignmentId: string;
  workbookId: string;
  workbookTitle: string;
  cohortId: string;
  cohortName: string;
  studentId: string;
  studentName: string;
  studentNo: string | null;
  attemptNo: number;
  status: 'in_progress' | 'submitted' | 'graded';
  score: number;
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  correctRate: number;
  submittedAt: string | null;
  startedAt?: string;
  gradedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  answers?: SubmissionAnswerApiItem[];
  gradedAnswers?: SubmissionAnswerApiItem[];
};

export type StudentScoreApiItem = {
  submissionId: string;
  assignmentId: string;
  workbook: {
    id: string;
    title: string;
  };
  cohort: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    name: string;
    studentNo: string | null;
  };
  attemptNo: number;
  status: 'in_progress' | 'submitted' | 'graded';
  score: number;
  totalPoints: number;
  earnedPoints: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  correctRate: number;
  startedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentScoreDetailApiItem = StudentScoreApiItem & {
  answers: StudentScoreAnswerApiItem[];
};

type ListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type DetailResponse<T> = {
  data: T;
};

export const studentApi = {
  listAssignments() {
    return apiRequest<ListResponse<StudentAssignmentApiItem>>('/student/assignments?page=1&limit=100');
  },

  getAssignment(assignmentId: string) {
    return apiRequest<DetailResponse<StudentAssignmentApiItem>>(`/student/assignments/${assignmentId}`);
  },

  createSubmission(payload: {
    assignmentId: string;
    startedAt?: string;
    answers: Array<{
      workbookQuestionId: string;
      selectedChoiceId?: string | null;
    }>;
  }) {
    return apiRequest<DetailResponse<StudentSubmissionApiItem>>('/student/submissions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listSubmissions() {
    return apiRequest<ListResponse<StudentSubmissionApiItem>>('/student/submissions?page=1&limit=100');
  },

  getSubmission(submissionId: string) {
    return apiRequest<DetailResponse<StudentSubmissionApiItem>>(`/student/submissions/${submissionId}`);
  },

  listScores() {
    return apiRequest<ListResponse<StudentScoreApiItem>>('/student/scores?page=1&limit=100');
  },

  getScore(submissionId: string) {
    return apiRequest<DetailResponse<StudentScoreDetailApiItem>>(`/student/scores/${submissionId}`);
  },
};
