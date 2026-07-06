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
  approvalToken?: string;
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

const persistStudentAuthResult = (data: KakaoLoginResponse['data']) => {
  if (data.status !== 'approved') {
    clearStudentAuth();
    const storedApproval = getStoredStudentApproval();
    const nextApproval: StudentApproval =
      data.status === 'pending' && !data.approvalToken && storedApproval?.approvalToken
        ? { ...data, approvalToken: storedApproval.approvalToken }
        : data;

    appStorage.setItem(STUDENT_APPROVAL_STORAGE_KEY, JSON.stringify(nextApproval));
    return nextApproval;
  }

  appStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken);
  appStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  clearStudentApproval();

  return data.user;
};

export const loginStudentWithKakaoCode = async (code: string, redirectUri: string, state: string) => {
  const response = await apiRequest<KakaoLoginResponse>('/auth/student/kakao/callback', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ code, redirectUri, state }),
  });

  return persistStudentAuthResult(response.data);
};

export const checkStudentApprovalStatus = async (approvalToken: string) => {
  const response = await apiRequest<KakaoLoginResponse>('/auth/student/approval-status', {
    auth: false,
    method: 'POST',
    body: JSON.stringify({ approvalToken }),
  });

  return persistStudentAuthResult(response.data);
};
