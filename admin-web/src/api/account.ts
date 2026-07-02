import { apiRequest } from '.';
import { syncAdminSessionUser } from '../lib/auth';

export type TeacherAccount = {
  id: string;
  role: 'teacher';
  name: string;
  loginId: string;
  email: string | null;
  teacherId: string;
  phone: string | null;
  department: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type UpdateTeacherAccountPayload = {
  loginId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type ChangeTeacherPasswordPayload = {
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
};

const syncTeacherAccountSession = (account: TeacherAccount) => {
  syncAdminSessionUser({
    id: account.id,
    name: account.name,
    loginId: account.loginId,
    email: account.email,
    role: account.role,
    teacherId: account.teacherId,
  });
};

export async function getTeacherAccount() {
  const response = await apiRequest<{ data: TeacherAccount }>('/auth/teacher/me');
  syncTeacherAccountSession(response.data);
  return response.data;
}

export async function updateTeacherAccount(payload: UpdateTeacherAccountPayload) {
  const response = await apiRequest<{ data: TeacherAccount }>('/auth/teacher/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  syncTeacherAccountSession(response.data);
  return response.data;
}

export async function changeTeacherPassword(payload: ChangeTeacherPasswordPayload) {
  return apiRequest<{ data: { changed: boolean } }>('/auth/teacher/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
