import { ACCESS_TOKEN_STORAGE_KEY, apiRequest, clearStudentAuth, USER_STORAGE_KEY } from './client';
import { appStorage } from './storage';

export type StudentUser = {
  id: string;
  role: 'student';
  name: string;
  loginId: string;
  email: string | null;
  studentId: string;
  cohortId: string;
};

type StudentLoginResponse = {
  data: {
    accessToken: string;
    user: StudentUser;
  };
};

export const getStoredStudentUser = () => {
  const rawUser = appStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StudentUser;
  } catch {
    clearStudentAuth();
    return null;
  }
};

export const getStudentAccessToken = () => appStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const loginStudent = async (id: string, password: string) => {
  const identifier = id.trim();
  const credentials = identifier.includes('@')
    ? { email: identifier, password }
    : { loginId: identifier, password };

  const response = await apiRequest<StudentLoginResponse>('/auth/student/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  appStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.data.accessToken);
  appStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));

  return response.data.user;
};
