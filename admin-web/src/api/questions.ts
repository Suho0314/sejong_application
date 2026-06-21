import { apiRequest } from '.';
import { ContentStatus, Difficulty, QuestionType } from '../types/domain';

export type QuestionChoiceApiItem = {
  id: string;
  text: string;
};

export type QuestionApiItem = {
  id: string;
  createdBy: string;
  subject: string;
  category: string | null;
  difficulty: Difficulty;
  type: QuestionType;
  content: string;
  choices: QuestionChoiceApiItem[];
  correctAnswerIndex: number;
  answerKey: number;
  explanation: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListQuestionsParams = {
  page: number;
  limit: number;
  keyword?: string;
  subject?: string;
  category?: string;
  difficulty?: Difficulty;
  status?: ContentStatus;
  type?: QuestionType;
};

export type QuestionPayload = {
  subject: string;
  category?: string | null;
  difficulty: Difficulty;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string | null;
  status: ContentStatus;
};

type QuestionListResponse = {
  data: QuestionApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type QuestionResponse = {
  data: QuestionApiItem;
};

const toQueryString = (params: ListQuestionsParams) => {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));

  if (params.keyword?.trim()) {
    searchParams.set('keyword', params.keyword.trim());
  }

  if (params.subject?.trim()) {
    searchParams.set('subject', params.subject.trim());
  }

  if (params.category?.trim()) {
    searchParams.set('category', params.category.trim());
  }

  if (params.difficulty) {
    searchParams.set('difficulty', params.difficulty);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.type) {
    searchParams.set('type', params.type);
  }

  return searchParams.toString();
};

export const questionApi = {
  list(params: ListQuestionsParams) {
    return apiRequest<QuestionListResponse>(`/admin/questions?${toQueryString(params)}`);
  },

  get(questionId: string) {
    return apiRequest<QuestionResponse>(`/admin/questions/${questionId}`);
  },

  create(payload: QuestionPayload) {
    return apiRequest<QuestionResponse>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(questionId: string, payload: QuestionPayload) {
    return apiRequest<QuestionResponse>(`/admin/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete(questionId: string) {
    return apiRequest<void>(`/admin/questions/${questionId}`, {
      method: 'DELETE',
    });
  },
};
