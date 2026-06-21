import { apiRequest } from '.';
import { AssignmentStatus } from '../types/domain';

export type WorkbookAssignmentApiItem = {
  id: string;
  workbook: {
    id: string;
    title: string;
  };
  cohort: {
    id: string;
    name: string;
  };
  assignedByTeacherId: string;
  status: AssignmentStatus;
  opensAt: string;
  closesAt: string | null;
  maxAttempts: number;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ListWorkbookAssignmentsParams = {
  page: number;
  limit: number;
  workbookId?: string;
  cohortId?: string;
  status?: AssignmentStatus;
};

export type WorkbookAssignmentPayload = {
  cohortId: string;
  status?: AssignmentStatus;
  opensAt: string;
  closesAt?: string | null;
  maxAttempts?: number;
};

export type UpdateWorkbookAssignmentPayload = Partial<Omit<WorkbookAssignmentPayload, 'cohortId'>>;

type WorkbookAssignmentListResponse = {
  data: WorkbookAssignmentApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type WorkbookAssignmentResponse = {
  data: WorkbookAssignmentApiItem;
};

const toQueryString = (params: ListWorkbookAssignmentsParams) => {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));

  if (params.workbookId) {
    searchParams.set('workbookId', params.workbookId);
  }

  if (params.cohortId) {
    searchParams.set('cohortId', params.cohortId);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  return searchParams.toString();
};

export const workbookAssignmentApi = {
  list(params: ListWorkbookAssignmentsParams) {
    return apiRequest<WorkbookAssignmentListResponse>(`/admin/workbook-assignments?${toQueryString(params)}`);
  },

  get(assignmentId: string) {
    return apiRequest<WorkbookAssignmentResponse>(`/admin/workbook-assignments/${assignmentId}`);
  },

  create(workbookId: string, payload: WorkbookAssignmentPayload) {
    return apiRequest<WorkbookAssignmentResponse>(`/admin/workbooks/${workbookId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(assignmentId: string, payload: UpdateWorkbookAssignmentPayload) {
    return apiRequest<WorkbookAssignmentResponse>(`/admin/workbook-assignments/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete(assignmentId: string) {
    return apiRequest<void>(`/admin/workbook-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  },
};
