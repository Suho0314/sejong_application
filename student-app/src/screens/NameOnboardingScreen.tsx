import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { useAuth } from '../state/AuthContext';
import type { ScreenProps } from '../types/navigation';
import { brand } from '../theme/brand';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '이름 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');

export function NameOnboardingScreen({ navigation }: ScreenProps<'NameOnboarding'>) {
  const { completeKakaoProfile, onboarding } = useAuth();
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedName = useMemo(() => normalizeName(name), [name]);
  const canSubmit = normalizedName.length > 0 && !isSubmitting;

  useEffect(() => {
    if (!onboarding?.onboardingToken) {
      navigation.replace('Login');
    }
  }, [navigation, onboarding?.onboardingToken]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await completeKakaoProfile(normalizedName);

      if ('role' in result) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'CohortSelect' }],
        });
        return;
      }

      if (result.status === 'needs_name') {
        setErrorMessage('이름 저장을 완료하지 못했습니다. 다시 시도해주세요.');
        return;
      }

      navigation.replace('ApprovalStatus');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.kicker}>KAKAO LOGIN</Text>
          <Text style={styles.title}>이름을 입력해주세요</Text>
          <Text style={styles.description}>승인 및 학습 관리를 위해 사용할 이름입니다.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              maxLength={100}
              returnKeyType="done"
              style={styles.input}
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => void handleSubmit()}
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <PrimaryButton disabled={!canSubmit} onPress={handleSubmit}>
              {isSubmitting ? '저장 중...' : '확인'}
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
    color: brand.colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: brand.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    color: brand.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 10,
  },
  label: {
    color: brand.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 14,
    color: brand.colors.textPrimary,
    backgroundColor: brand.colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: brand.colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
});
