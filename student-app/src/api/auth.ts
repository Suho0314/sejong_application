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
    status: 'approved';
    accessToken: string;
    user: StudentUser;
  };
};

export type StudentApprovalStatus = 'pending' | 'rejected' | 'suspended';

export type StudentApproval = {
  status: StudentApprovalStatus;
  student: {
    id: string;
    name: string;
    email: string | null;
    cohortId: string | null;
    status: StudentApprovalStatus;
  };
};

type KakaoAuthorizeResponse = {
  data: {
    authorizationUrl: string;
  };
};

type KakaoLoginResponse = StudentLoginResponse | {
  data: StudentApproval;
};

export const STUDENT_APPROVAL_STORAGE_KEY = 'sejong_student_approval';

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

export const getStoredStudentApproval = () => {
  const rawApproval = appStorage.getItem(STUDENT_APPROVAL_STORAGE_KEY);

  if (!rawApproval) return null;

  try {
    return JSON.parse(rawApproval) as StudentApproval;
  } catch {
    appStorage.removeItem(STUDENT_APPROVAL_STORAGE_KEY);
    return null;
  }
};

export const clearStudentApproval = () => {
  appStorage.removeItem(STUDENT_APPROVAL_STORAGE_KEY);
};

export const getKakaoAuthorizationUrl = async (redirectUri: string, state: string) => {
  const response = await apiRequest<KakaoAuthorizeResponse>(
    `/auth/student/kakao/authorize?redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`,
    { auth: false },
  );

  return response.data.authorizationUrl;
};

export const loginStudentWithKakaoCode = async (code: string, redirectUri: string, state: string) => {
  const response = await apiRequest<KakaoLoginResponse>('/auth/student/kakao/callback', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ code, redirectUri, state }),
  });

  if (response.data.status !== 'approved') {
    clearStudentAuth();
    appStorage.setItem(STUDENT_APPROVAL_STORAGE_KEY, JSON.stringify(response.data));
    return response.data;
  }

  appStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.data.accessToken);
  appStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.user));
  clearStudentApproval();

  return response.data.user;
};
