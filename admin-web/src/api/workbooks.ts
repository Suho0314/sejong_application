import { apiRequest } from '.';
import { ContentStatus } from '../types/domain';

export type WorkbookQuestionApiItem = {
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

export type WorkbookApiItem = {
  id: string;
  title: string;
  description: string | null;
  status: ContentStatus;
  passScore: number;
  questionCount?: number;
  questions?: WorkbookQuestionApiItem[];
  createdAt: string;
  updatedAt: string;
};

export type ListWorkbooksParams = {
  page: number;
  limit: number;
  keyword?: string;
  status?: ContentStatus;
};

export type WorkbookPayload = {
  title: string;
  description?: string | null;
  status: ContentStatus;
  passScore: number;
};

export type UpdateWorkbookQuestionsPayload = {
  questions: Array<{
    questionId: string;
    sequence: number;
    points: number;
    isRequired: boolean;
  }>;
};

type WorkbookListResponse = {
  data: WorkbookApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type WorkbookResponse = {
  data: WorkbookApiItem;
};

type UpdateWorkbookQuestionsResponse = {
  data: {
    workbookId: string;
    questions: WorkbookQuestionApiItem[];
    updatedAt: string;
  };
};

const toQueryString = (params: ListWorkbooksParams) => {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));

  if (params.keyword?.trim()) {
    searchParams.set('keyword', params.keyword.trim());
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  return searchParams.toString();
};

export const workbookApi = {
  list(params: ListWorkbooksParams) {
    return apiRequest<WorkbookListResponse>(`/admin/workbooks?${toQueryString(params)}`);
  },

  get(workbookId: string) {
    return apiRequest<WorkbookResponse>(`/admin/workbooks/${workbookId}`);
  },

  create(payload: WorkbookPayload) {
    return apiRequest<WorkbookResponse>('/admin/workbooks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(workbookId: string, payload: WorkbookPayload) {
    return apiRequest<WorkbookResponse>(`/admin/workbooks/${workbookId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  updateQuestions(workbookId: string, payload: UpdateWorkbookQuestionsPayload) {
    return apiRequest<UpdateWorkbookQuestionsResponse>(`/admin/workbooks/${workbookId}/questions`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(workbookId: string) {
    return apiRequest<void>(`/admin/workbooks/${workbookId}`, {
      method: 'DELETE',
    });
  },
};
