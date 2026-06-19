import { adminAccount } from '../mock/adminAccount';

const AUTH_STORAGE_KEY = 'sejong_admin_auth';

export type AdminSession = {
  id: string;
  name: string;
  loggedInAt: string;
};

export const loginAdmin = (id: string, password: string) => {
  const isValid = id.trim() === adminAccount.id && password === adminAccount.password;

  if (!isValid) return null;

  const session: AdminSession = {
    id: adminAccount.id,
    name: adminAccount.name,
    loggedInAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
};

export const getAdminSession = (): AdminSession | null => {
  const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AdminSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const isAdminAuthenticated = () => Boolean(getAdminSession());

export const logoutAdmin = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const findAdminId = (answer: string) => {
  if (answer.trim() !== adminAccount.securityAnswer) return null;
  return adminAccount.id;
};

export const findAdminPassword = (answer: string) => {
  if (answer.trim() !== adminAccount.securityAnswer) return null;
  return adminAccount.password;
};
