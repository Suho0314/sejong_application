import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { ApiNetworkError } from '../api/client';
import { useAuth } from '../state/AuthContext';
import type { ScreenProps } from '../types/navigation';

const POLLING_INTERVAL_MS = 5000;

const statusMessages = {
  pending: {
    title: '승인 대기 중입니다.',
    description: '강사가 학생 정보를 확인하고 기수를 배정하면 앱을 이용할 수 있습니다.',
  },
  rejected: {
    title: '가입 승인이 거절되었습니다.',
    description: '학원에 문의해 가입 정보를 다시 확인해주세요.',
  },
  suspended: {
    title: '이용이 중지된 계정입니다.',
    description: '서비스 이용 재개가 필요하면 학원에 문의해주세요.',
  },
};

const getStatusErrorMessage = (error: unknown) => {
  if (error instanceof ApiNetworkError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '승인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.';
};

const formatCheckedAt = (date: Date | null) => {
  if (!date) return '';

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds(),
  ).padStart(2, '0')}`;
};

export function ApprovalStatusScreen({ navigation }: ScreenProps<'ApprovalStatus'>) {
  const { approval, logout, refreshApprovalStatus } = useAuth();
  const status = approval?.status ?? 'pending';
  const message = statusMessages[status];
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const checkApprovalStatus = useCallback(async () => {
    if (isCheckingRef.current || hasNavigatedRef.current || status !== 'pending') {
      return;
    }

    if (!approval?.approvalToken) {
      setErrorMessage('승인 상태 확인 정보가 없습니다. 다시 카카오 로그인해주세요.');
      return;
    }

    isCheckingRef.current = true;

    try {
      const result = await refreshApprovalStatus();

      if (!isMountedRef.current) return;

      setLastCheckedAt(new Date());
      setErrorMessage('');

      if ('role' in result && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigation.reset({
          index: 0,
          routes: [{ name: 'CohortSelect' }],
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setErrorMessage(getStatusErrorMessage(error));
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [approval?.approvalToken, navigation, refreshApprovalStatus, status]);

  useEffect(() => {
    isMountedRef.current = true;
    void checkApprovalStatus();

    return () => {
      isMountedRef.current = false;
    };
  }, [checkApprovalStatus]);

  useEffect(() => {
    if (status !== 'pending' || !approval?.approvalToken) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      void checkApprovalStatus();
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [approval?.approvalToken, checkApprovalStatus, status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkApprovalStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkApprovalStatus]);

  const handleRestartLogin = () => {
    logout();
    navigation.replace('Login');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.kicker}>KAKAO LOGIN</Text>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.description}>{message.description}</Text>

          {approval?.student ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>학생명</Text>
              <Text style={styles.infoValue}>{approval.student.name}</Text>
              <Text style={styles.infoLabel}>상태</Text>
              <Text style={styles.infoValue}>{status}</Text>
              {lastCheckedAt ? (
                <>
                  <Text style={styles.infoLabel}>최근 확인</Text>
                  <Text style={styles.infoValue}>{formatCheckedAt(lastCheckedAt)}</Text>
                </>
              ) : null}
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            {!approval?.approvalToken && status === 'pending' ? (
              <PrimaryButton variant="light" onPress={handleRestartLogin}>
                카카오 로그인 다시 하기
              </PrimaryButton>
            ) : null}
            <PrimaryButton variant="light" onPress={() => logout()}>
              로그아웃
            </PrimaryButton>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F3FBF5',
  },
  card: {
    gap: 14,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  kicker: {
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: '#1A1F1B',
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    color: '#66706A',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F7F9F7',
  },
  infoLabel: {
    color: '#66706A',
    fontSize: 12,
    fontWeight: '800',
  },
  infoValue: {
    color: '#1A1F1B',
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: '#D14343',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
});
