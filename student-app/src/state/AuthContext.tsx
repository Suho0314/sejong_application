import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';

import {
  checkStudentApprovalStatus,
  clearStudentApproval,
  clearStudentOnboarding,
  completeStudentKakaoProfile,
  getKakaoAuthorizationUrl,
  getStoredStudentApproval,
  getStoredStudentOnboarding,
  getStoredStudentUser,
  getStudentAccessToken,
  loginStudentWithKakaoCode,
  StudentApproval,
  StudentOnboarding,
  StudentUser,
} from '../api/auth';
import { clearStudentAuth, getAuthExpiredMessage } from '../api/client';

type StudentAuthResult = StudentUser | StudentApproval | StudentOnboarding;

type AuthContextValue = {
  user: StudentUser | null;
  approval: StudentApproval | null;
  onboarding: StudentOnboarding | null;
  expiredMessage: string;
  isAuthenticated: boolean;
  getKakaoLoginUrl: (redirectUri: string, state: string) => Promise<string>;
  completeKakaoLogin: (code: string, redirectUri: string, state: string) => Promise<StudentAuthResult>;
  completeKakaoProfile: (name: string) => Promise<StudentAuthResult>;
  refreshApprovalStatus: () => Promise<StudentUser | StudentApproval>;
  logout: (message?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StudentUser | null>(() => getStoredStudentUser());
  const [approval, setApproval] = useState<StudentApproval | null>(() => getStoredStudentApproval());
  const [onboarding, setOnboarding] = useState<StudentOnboarding | null>(() => getStoredStudentOnboarding());
  const [expiredMessage, setExpiredMessage] = useState(() => getAuthExpiredMessage());
  const isAuthenticated = Boolean(user && getStudentAccessToken());

  const value = useMemo<AuthContextValue>(() => {
    const applyAuthResult = (result: StudentAuthResult) => {
      if ('role' in result) {
        setUser(result);
        setApproval(null);
        setOnboarding(null);
        setExpiredMessage('');
      } else if (result.status === 'needs_name') {
        setUser(null);
        setApproval(null);
        setOnboarding(result);
      } else {
        setUser(null);
        setOnboarding(null);
        setApproval(result);
      }

      return result;
    };

    return {
      user,
      approval,
      onboarding,
      expiredMessage,
      isAuthenticated,
      getKakaoLoginUrl: getKakaoAuthorizationUrl,
      completeKakaoLogin: async (code, redirectUri, state) => {
        const result = await loginStudentWithKakaoCode(code, redirectUri, state);
        return applyAuthResult(result);
      },
      completeKakaoProfile: async (name) => {
        const onboardingToken = onboarding?.onboardingToken;

        if (!onboardingToken) {
          throw new Error('이름 입력 정보가 없습니다. 다시 카카오 로그인해주세요.');
        }

        const result = await completeStudentKakaoProfile(onboardingToken, name);
        return applyAuthResult(result);
      },
      refreshApprovalStatus: async () => {
        const approvalToken = approval?.approvalToken;

        if (!approvalToken) {
          throw new Error('승인 상태 확인 정보가 없습니다. 다시 카카오 로그인해주세요.');
        }

        const result = await checkStudentApprovalStatus(approvalToken);
        applyAuthResult(result);
        return result;
      },
      logout: (message = '') => {
        clearStudentAuth();
        clearStudentApproval();
        clearStudentOnboarding();
        setUser(null);
        setApproval(null);
        setOnboarding(null);
        setExpiredMessage(message);
      },
    };
  }, [approval, expiredMessage, isAuthenticated, onboarding, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
