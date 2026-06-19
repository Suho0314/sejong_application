import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import { mockStudent } from '../mock/studentMockData';
import type { ScreenProps } from '../types/navigation';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>문</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.kicker}>NURSING ACADEMY</Text>
          <Text style={styles.title}>간호문제</Text>
          <Text style={styles.description}>배포된 문제집을 확인하고 오답을 정리하세요.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>아이디</Text>
          <TextInput
            style={styles.input}
            placeholder="아이디"
            defaultValue={mockStudent.loginId}
            autoCapitalize="none"
          />
          <Text style={styles.label}>비밀번호</Text>
          <TextInput style={styles.input} placeholder="비밀번호" defaultValue="1234" secureTextEntry />
          <PrimaryButton onPress={() => navigation.replace('CohortSelect')}>로그인</PrimaryButton>
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
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
  },
  logoText: {
    color: '#1D4ED8',
    fontSize: 24,
    fontWeight: '900',
  },
  header: {
    marginBottom: 32,
  },
  kicker: {
    marginBottom: 8,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#172554',
    fontSize: 36,
    fontWeight: '900',
  },
  description: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  form: {
    gap: 10,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    height: 52,
    marginBottom: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
});
