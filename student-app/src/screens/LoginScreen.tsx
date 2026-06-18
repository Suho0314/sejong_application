import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../types/navigation';

export function LoginScreen({ navigation }: ScreenProps<'Login'>) {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>STUDENT APP</Text>
        <Text style={styles.title}>간호문제</Text>
        <Text style={styles.description}>학생 로그인을 위한 placeholder 화면입니다.</Text>
      </View>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="아이디" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="비밀번호" secureTextEntry />
        <PrimaryButton onPress={() => navigation.replace('Home')}>로그인</PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 72,
    marginBottom: 32,
  },
  kicker: {
    marginBottom: 8,
    color: '#20C9C3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#17183B',
    fontSize: 34,
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    color: '#7D8494',
    fontSize: 14,
  },
  form: {
    gap: 12,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E1E4EA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
});
