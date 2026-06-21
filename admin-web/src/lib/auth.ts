import { adminAccount } from '../mock/adminAccount';
import { apiRequest } from '../api';

const AUTH_STORAGE_KEY = 'sejong_admin_auth';
const ACCESS_TOKEN_STORAGE_KEY = 'sejong_admin_access_token';
const USER_STORAGE_KEY = 'sejong_admin_user';
const ACCOUNT_STORAGE_KEY = 'sejong_admin_account';

export type AdminSession = {
  id: string;
  name: string;
  loginId: string;
  email: string | null;
  role: 'admin' | 'teacher';
  teacherId?: string;
  accessToken: string;
  loggedInAt: string;
};

type TeacherLoginResponse = {
  data: {
    accessToken: string;
    user: {
      id: string;
      role: 'teacher';
      name: string;
      loginId: string;
      email: string | null;
      teacherId?: string;
    };
  };
};

export type AdminAccount = {
  id: string;
  password: string;
  name: string;
  securityQuestion: string;
  securityAnswer: string;
};

export const getAdminAccount = (): AdminAccount => {
  const rawAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);

  if (!rawAccount) return adminAccount;

  try {
    return {
      ...adminAccount,
      ...(JSON.parse(rawAccount) as Partial<AdminAccount>),
    };
  } catch {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    return adminAccount;
  }
};

const saveAdminAccount = (account: AdminAccount) => {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
};

const syncSessionId = (id: string) => {
  const session = getAdminSession();
  if (!session) return;

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...session,
      id,
    }),
  );
};

export const loginAdmin = (id: string, password: string) => {
  const identifier = id.trim();
  const credentials = identifier.includes('@')
    ? { email: identifier, password }
    : { loginId: identifier, password };

  return apiRequest<TeacherLoginResponse>('/auth/teacher/login', {
    auth: false,
    method: 'POST',
    body: JSON.stringify(credentials),
  }).then(({ data }) => {
    const session: AdminSession = {
      id: data.user.id,
      name: data.user.name,
      loginId: data.user.loginId,
      email: data.user.email,
      role: data.user.role,
      teacherId: data.user.teacherId,
      accessToken: data.accessToken,
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, data.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    return session;
  });
};

export const getAdminSession = (): AdminSession | null => {
  const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession) as AdminSession;
    return session.accessToken ? session : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

export const isAdminAuthenticated = () => Boolean(getAccessToken() && getAdminSession());

export const logoutAdmin = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const findAdminId = (answer: string) => {
  const account = getAdminAccount();
  if (answer.trim() !== account.securityAnswer) return null;
  return account.id;
};

export const findAdminPassword = (answer: string) => {
  const account = getAdminAccount();
  if (answer.trim() !== account.securityAnswer) return null;
  return account.password;
};

export const changeAdminId = (nextId: string, currentPassword: string) => {
  const account = getAdminAccount();
  const id = nextId.trim();

  if (!id) {
    return { ok: false, message: '새 ID를 입력하세요.' };
  }

  if (currentPassword !== account.password) {
    return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };
  }

  const nextAccount = {
    ...account,
    id,
  };

  saveAdminAccount(nextAccount);
  syncSessionId(id);
  return { ok: true, message: 'ID가 변경되었습니다. 다음 로그인부터 새 ID를 사용하세요.' };
};

export const changeAdminPassword = (currentPassword: string, nextPassword: string, confirmPassword: string) => {
  const account = getAdminAccount();
  const password = nextPassword.trim();

  if (currentPassword !== account.password) {
    return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };
  }

  if (!password) {
    return { ok: false, message: '새 비밀번호를 입력하세요.' };
  }

  if (password !== confirmPassword) {
    return { ok: false, message: '새 비밀번호 확인이 일치하지 않습니다.' };
  }

  saveAdminAccount({
    ...account,
    password,
  });
  return { ok: true, message: '비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용하세요.' };
};
