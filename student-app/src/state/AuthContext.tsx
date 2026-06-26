import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  clearStudentApproval,
  getKakaoAuthorizationUrl,
  getStoredStudentApproval,
  getStoredStudentUser,
  getStudentAccessToken,
  loginStudentWithKakaoCode,
  StudentApproval,
  StudentUser,
} from '../api/auth';
import { clearStudentAuth, getAuthExpiredMessage } from '../api/client';

type AuthContextValue = {
  user: StudentUser | null;
  approval: StudentApproval | null;
  expiredMessage: string;
  isAuthenticated: boolean;
  getKakaoLoginUrl: (redirectUri: string, state: string) => Promise<string>;
  completeKakaoLogin: (code: string, redirectUri: string, state: string) => Promise<StudentUser | StudentApproval>;
  logout: (message?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StudentUser | null>(() => getStoredStudentUser());
  const [approval, setApproval] = useState<StudentApproval | null>(() => getStoredStudentApproval());
  const [expiredMessage, setExpiredMessage] = useState(() => getAuthExpiredMessage());
  const isAuthenticated = Boolean(user && getStudentAccessToken());

  const value = useMemo<AuthContextValue>(() => ({
    user,
    approval,
    expiredMessage,
    isAuthenticated,
    getKakaoLoginUrl: getKakaoAuthorizationUrl,
    completeKakaoLogin: async (code, redirectUri, state) => {
      const result = await loginStudentWithKakaoCode(code, redirectUri, state);

      if ('role' in result) {
        setUser(result);
        setApproval(null);
        setExpiredMessage('');
      } else {
        setUser(null);
        setApproval(result);
      }

      return result;
    },
    logout: (message = '') => {
      clearStudentAuth();
      clearStudentApproval();
      setUser(null);
      setApproval(null);
      setExpiredMessage(message);
    },
  }), [approval, expiredMessage, isAuthenticated, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
