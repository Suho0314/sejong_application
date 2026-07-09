import { apiRequest } from '.';
import { ContentStatus, QuestionType } from '../types/domain';

export type QuestionChoiceApiItem = {
  id: string;
  text: string;
};

export type QuestionApiItem = {
  id: string;
  createdBy: string;
  subject: string;
  category: string | null;
  type: QuestionType;
  content: string;
  choices: QuestionChoiceApiItem[];
  correctAnswerIndex: number;
  answerKey: number;
  answerCount: number;
  correctCount: number;
  wrongCount: number;
  wrongRate: number;
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
  status?: ContentStatus;
  type?: QuestionType;
  sortBy?: 'createdAt' | 'wrongRate';
  sortOrder?: 'asc' | 'desc';
};

export type QuestionPayload = {
  subject: string;
  category?: string | null;
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

export type PdfQuestionImportPreviewOptions = {
  useAiAssist?: boolean;
  aiAssistMode?: 'all' | 'review_only';
};

export type PdfQuestionImportConfirmItem = {
  questionNumber?: number;
  subject: string;
  category?: string | null;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
};

export type BulkUpdateQuestionStatusPayload = {
  questionIds: string[];
  status: ContentStatus;
};

export type BulkUpdateQuestionSubjectPayload = {
  questionIds: string[];
  subject: string;
};

export type BulkUpdateQuestionCategoryPayload = {
  questionIds: string[];
  category: string;
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

type QuestionCategoriesResponse = {
  data: string[];
};

type QuestionFilterOptionsResponse = {
  data: {
    subjects: string[];
    categories: string[];
  };
};

type PdfQuestionImportPreviewResponse = {
  data: {
    items: PdfQuestionImportPreviewItem[];
    summary: {
      total: number;
      ready: number;
      needsReview: number;
      invalid: number;
      parseWarnings?: string[];
    };
  };
};

type PdfQuestionImportConfirmResponse = {
  data: {
    createdCount: number;
    questions: QuestionApiItem[];
  };
};

type BulkUpdateQuestionStatusResponse = {
  data: {
    updatedCount: number;
    status: ContentStatus;
    questionIds: string[];
  };
};

type BulkUpdateQuestionSubjectResponse = {
  data: {
    updatedCount: number;
    subject: string;
    questionIds: string[];
  };
};

type BulkUpdateQuestionCategoryResponse = {
  data: {
    updatedCount: number;
    category: string;
    questionIds: string[];
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

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.type) {
    searchParams.set('type', params.type);
  }

  searchParams.set('sortBy', params.sortBy ?? 'createdAt');
  searchParams.set('sortOrder', params.sortOrder ?? 'desc');

  return searchParams.toString();
};

export const questionApi = {
  list(params: ListQuestionsParams) {
    return apiRequest<QuestionListResponse>(`/admin/questions?${toQueryString(params)}`);
  },

  listCategories() {
    return apiRequest<QuestionCategoriesResponse>('/admin/questions/categories');
  },

  listFilterOptions(params?: { status?: ContentStatus }) {
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.set('status', params.status);
    }

    const queryString = searchParams.toString();
    return apiRequest<QuestionFilterOptionsResponse>(
      `/admin/questions/filter-options${queryString ? `?${queryString}` : ''}`,
    );
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

  previewPdfImport(questionPdf: File, answerPdf: File, options: PdfQuestionImportPreviewOptions = {}) {
    const formData = new FormData();

    formData.append('questionPdf', questionPdf);
    formData.append('answerPdf', answerPdf);

    if (options.useAiAssist) {
      formData.append('useAiAssist', 'true');
      formData.append('aiAssistMode', options.aiAssistMode ?? 'all');
    }

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

  bulkUpdateStatus(payload: BulkUpdateQuestionStatusPayload) {
    return apiRequest<BulkUpdateQuestionStatusResponse>('/admin/questions/bulk/status', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  bulkUpdateSubject(payload: BulkUpdateQuestionSubjectPayload) {
    return apiRequest<BulkUpdateQuestionSubjectResponse>('/admin/questions/bulk/subject', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  bulkUpdateCategory(payload: BulkUpdateQuestionCategoryPayload) {
    return apiRequest<BulkUpdateQuestionCategoryResponse>('/admin/questions/bulk/category', {
      method: 'PATCH',
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
