import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../types/navigation';

export function ResultScreen({ navigation, route }: ScreenProps<'Result'>) {
  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.kicker}>결과 확인</Text>
        <Text style={styles.score}>{route.params?.score ?? 0}점</Text>
        <Text style={styles.description}>
          문제집 ID: {route.params?.workbookId ?? '없음'}
        </Text>
        <Text style={styles.description}>채점 결과와 오답 목록은 다음 이슈에서 연결합니다.</Text>
      </View>

      <PrimaryButton onPress={() => navigation.navigate('Home')}>홈으로 이동</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  kicker: {
    marginBottom: 8,
    color: '#20C9C3',
    fontSize: 12,
    fontWeight: '800',
  },
  score: {
    color: '#17183B',
    fontSize: 52,
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    color: '#7D8494',
    lineHeight: 20,
    textAlign: 'center',
  },
});
