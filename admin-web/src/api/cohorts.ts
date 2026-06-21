import { apiRequest } from '.';

export type CohortApiItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListCohortsParams = {
  page: number;
  limit: number;
  keyword?: string;
  isActive?: boolean;
};

export type CohortPayload = {
  name: string;
  code: string;
  description?: string | null;
  startsOn: string;
  endsOn?: string | null;
  isActive: boolean;
};

type CohortListResponse = {
  data: CohortApiItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

type CohortResponse = {
  data: CohortApiItem;
};

const toQueryString = (params: ListCohortsParams) => {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));

  if (params.keyword?.trim()) {
    searchParams.set('keyword', params.keyword.trim());
  }

  if (typeof params.isActive === 'boolean') {
    searchParams.set('isActive', String(params.isActive));
  }

  return searchParams.toString();
};

export const cohortApi = {
  list(params: ListCohortsParams) {
    return apiRequest<CohortListResponse>(`/admin/cohorts?${toQueryString(params)}`);
  },

  create(payload: CohortPayload) {
    return apiRequest<CohortResponse>('/admin/cohorts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(cohortId: string, payload: CohortPayload) {
    return apiRequest<CohortResponse>(`/admin/cohorts/${cohortId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete(cohortId: string) {
    return apiRequest<void>(`/admin/cohorts/${cohortId}`, {
      method: 'DELETE',
    });
  },
};

