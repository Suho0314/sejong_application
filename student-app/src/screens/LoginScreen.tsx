import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { ApiConfigurationError, ApiNetworkError } from '../api/client';
import { useAuth } from '../state/AuthContext';
import type { ScreenProps } from '../types/navigation';
import { brand } from '../theme/brand';
import sgneLogo from '../../assets/sgne-logo.png';

const KAKAO_CALLBACK_SCHEME = 'nursing-student-app://kakao/oauth';
const KAKAO_OAUTH_STATE_STORAGE_KEY = 'sejong_kakao_oauth_state';
let nativeOAuthState: string | null = null;

const getWebLocation = () => {
  if (typeof globalThis === 'undefined' || !('location' in globalThis)) return null;
  return (globalThis as typeof globalThis & { location: Location }).location;
};

const getSessionStorage = () => {
  if (typeof globalThis === 'undefined' || !('sessionStorage' in globalThis)) return null;
  return (globalThis as typeof globalThis & { sessionStorage: Storage }).sessionStorage;
};

const generateOAuthState = () => {
  const bytes = new Uint8Array(32);
  const cryptoObject = (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;

  if (!cryptoObject?.getRandomValues) {
    throw new Error('보안 로그인을 위한 난수 생성 기능을 사용할 수 없습니다.');
  }

  cryptoObject.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const saveOAuthState = (state: string) => {
  const sessionStorage = getSessionStorage();

  if (Platform.OS === 'web' && sessionStorage) {
    sessionStorage.setItem(KAKAO_OAUTH_STATE_STORAGE_KEY, state);
    return;
  }

  nativeOAuthState = state;
};

const getStoredOAuthState = () => {
  const sessionStorage = getSessionStorage();

  if (Platform.OS === 'web' && sessionStorage) {
    return sessionStorage.getItem(KAKAO_OAUTH_STATE_STORAGE_KEY);
  }

  return nativeOAuthState;
};

const clearOAuthState = () => {
  getSessionStorage()?.removeItem(KAKAO_OAUTH_STATE_STORAGE_KEY);
  nativeOAuthState = null;
};

const getRedirectUri = () => {
  const configured = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI?.trim();
  if (configured) return configured;

  const webLocation = getWebLocation();
  if (Platform.OS === 'web' && webLocation?.origin) {
    return webLocation.origin;
  }

  return KAKAO_CALLBACK_SCHEME;
};

const extractCodeFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('code');
  } catch {
    return null;
  }
};

const extractStateFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('state');
  } catch {
    return null;
  }
};

const clearWebKakaoQuery = () => {
  if (Platform.OS !== 'web') return;
  const history = (globalThis as typeof globalThis & { history?: History }).history;
  const location = getWebLocation();

  if (history && location?.origin) {
    history.replaceState({}, '', location.origin);
  }
};

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof ApiNetworkError || error instanceof ApiConfigurationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '카카오 로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  const { approval, completeKakaoLogin, expiredMessage, getKakaoLoginUrl, isAuthenticated, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState(expiredMessage);
  const [isLoading, setIsLoading] = useState(false);
  const redirectUri = useMemo(getRedirectUri, []);

  const handleKakaoCallbackUrl = useCallback(async (url: string) => {
    const code = extractCodeFromUrl(url);
    const callbackState = extractStateFromUrl(url);
    if (!code || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const storedState = getStoredOAuthState();

      if (!callbackState) {
        throw new Error('카카오 로그인 state 값이 없어 로그인을 완료할 수 없습니다. 다시 시도해주세요.');
      }

      if (!storedState) {
        throw new Error('만료된 카카오 로그인 요청입니다. 다시 로그인해주세요.');
      }

      if (callbackState !== storedState) {
        throw new Error('카카오 로그인 요청이 일치하지 않습니다. 다시 로그인해주세요.');
      }

      const result = await completeKakaoLogin(code, redirectUri, callbackState);
      clearWebKakaoQuery();
      clearOAuthState();

      if ('role' in result) {
        navigation.replace('CohortSelect');
      } else {
        navigation.replace('ApprovalStatus');
      }
    } catch (error) {
      clearOAuthState();
      clearWebKakaoQuery();
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [completeKakaoLogin, isLoading, navigation, redirectUri]);

  useEffect(() => {
    if (isAuthenticated && user?.cohortId) {
      navigation.replace('CohortSelect');
      return;
    }

    if (approval) {
      navigation.replace('ApprovalStatus');
    }
  }, [approval, isAuthenticated, navigation, user?.cohortId]);

  useEffect(() => {
    const webLocation = getWebLocation();

    if (Platform.OS === 'web' && webLocation?.href) {
      void handleKakaoCallbackUrl(webLocation.href);
    }

    const subscription = Linking.addEventListener('url', (event) => {
      void handleKakaoCallbackUrl(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) void handleKakaoCallbackUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleKakaoCallbackUrl]);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const state = generateOAuthState();
      saveOAuthState(state);

      const authorizationUrl = await getKakaoLoginUrl(redirectUri, state);

      if (Platform.OS === 'web') {
        const webLocation = getWebLocation();
        if (webLocation) {
          webLocation.href = authorizationUrl;
          return;
        }
      }

      await Linking.openURL(authorizationUrl);
    } catch (error) {
      clearOAuthState();
      setErrorMessage(getLoginErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Image source={{ uri: sgneLogo }} style={styles.logo} resizeMode="contain" />

        <View style={styles.header}>
          <Text style={styles.kicker}>NURSING ACADEMY</Text>
          <Text style={styles.title}>세종고운간호전문학원</Text>
          <Text style={styles.description}>카카오 로그인 후 강사 승인이 완료되면 문제집을 풀이할 수 있습니다.</Text>
        </View>

        <View style={styles.form}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <PrimaryButton disabled={isLoading} variant="kakao" onPress={handleKakaoLogin}>
            {isLoading ? '카카오 로그인 중...' : '카카오로 로그인'}
          </PrimaryButton>
          <Text style={styles.helperText}>
            처음 로그인한 학생은 승인대기 상태로 등록됩니다.
          </Text>
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
    backgroundColor: brand.colors.background,
  },
  logo: {
    width: 96,
    height: 94,
    marginBottom: 26,
  },
  header: {
    marginBottom: 32,
  },
  kicker: {
    marginBottom: 8,
    color: brand.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: brand.colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  description: {
    marginTop: 8,
    color: brand.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  errorText: {
    marginBottom: 8,
    color: brand.colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  helperText: {
    color: brand.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
