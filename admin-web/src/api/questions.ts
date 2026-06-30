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
  status: ContentStatus;
};

export type PdfImportPreviewStatus = 'ready' | 'needs_review' | 'invalid';

export type PdfQuestionImportPreviewItem = {
  questionNumber: number;
  subject: string;
  category: string | null;
  content: string;
  choices: string[];
  correctAnswerIndex: number | null;
  answerNumber: number | null;
  status: PdfImportPreviewStatus;
  reasons: string[];
};

export type PdfQuestionImportConfirmItem = {
  questionNumber?: number;
  subject: string;
  category?: string | null;
  difficulty?: Difficulty;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
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

type PdfQuestionImportPreviewResponse = {
  data: {
    items: PdfQuestionImportPreviewItem[];
    summary: {
      total: number;
      ready: number;
      needsReview: number;
      invalid: number;
    };
  };
};

type PdfQuestionImportConfirmResponse = {
  data: {
    createdCount: number;
    questions: QuestionApiItem[];
  };
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

  previewPdfImport(questionPdf: File, answerPdf: File) {
    const formData = new FormData();

    formData.append('questionPdf', questionPdf);
    formData.append('answerPdf', answerPdf);

    return apiRequest<PdfQuestionImportPreviewResponse>('/admin/questions/pdf-import/preview', {
      method: 'POST',
      body: formData,
    });
  },

  confirmPdfImport(permissionConfirmed: boolean, questions: PdfQuestionImportConfirmItem[]) {
    return apiRequest<PdfQuestionImportConfirmResponse>('/admin/questions/pdf-import/confirm', {
      method: 'POST',
      body: JSON.stringify({
        permissionConfirmed,
        questions,
      }),
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
