import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  getStoredStudentUser,
  getStudentAccessToken,
  loginStudent,
  StudentUser,
} from '../api/auth';
import { clearStudentAuth, getAuthExpiredMessage } from '../api/client';

type AuthContextValue = {
  user: StudentUser | null;
  expiredMessage: string;
  isAuthenticated: boolean;
  login: (id: string, password: string) => Promise<StudentUser>;
  logout: (message?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StudentUser | null>(() => getStoredStudentUser());
  const [expiredMessage, setExpiredMessage] = useState(() => getAuthExpiredMessage());
  const isAuthenticated = Boolean(user && getStudentAccessToken());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    expiredMessage,
    isAuthenticated,
    login: async (id, password) => {
      const nextUser = await loginStudent(id, password);
      setUser(nextUser);
      setExpiredMessage('');
      return nextUser;
    },
    logout: (message = '') => {
      clearStudentAuth();
      setUser(null);
      setExpiredMessage(message);
    },
  }), [expiredMessage, isAuthenticated, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
