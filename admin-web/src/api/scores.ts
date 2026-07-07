import { apiRequest } from '.';
import { SubmissionStatus } from '../types/domain';

export type ScoreApiItem = {
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
  status: SubmissionStatus;
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

export type WorkbookQuestionStatsApiItem = {
  questionNumber: number;
  questionId: string;
  questionText: string;
  answerCount: number;
  correctCount: number;
  wrongCount: number;
  wrongRate: number;
};

export type ListScoresParams = {
  page: number;
  limit: number;
  cohortId?: string;
  studentId?: string;
  workbookId?: string;
  assignmentId?: string;
};

type ScoreListResponse = {
  data: ScoreApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type WorkbookQuestionStatsResponse = {
  data: WorkbookQuestionStatsApiItem[];
};

const toQueryString = (params: ListScoresParams) => {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));

  if (params.cohortId) searchParams.set('cohortId', params.cohortId);
  if (params.studentId) searchParams.set('studentId', params.studentId);
  if (params.workbookId) searchParams.set('workbookId', params.workbookId);
  if (params.assignmentId) searchParams.set('assignmentId', params.assignmentId);

  return searchParams.toString();
};

export const scoreApi = {
  list(params: ListScoresParams) {
    return apiRequest<ScoreListResponse>(`/admin/scores?${toQueryString(params)}`);
  },

  getWorkbookQuestionStats(workbookId: string) {
    return apiRequest<WorkbookQuestionStatsResponse>(`/admin/scores/workbooks/${workbookId}/question-stats`);
  },
};
