import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.kicker}>오늘의 학습</Text>
        <Text style={styles.title}>홈 화면</Text>
        <Text style={styles.description}>배포된 문제집과 학습 현황을 보여줄 placeholder입니다.</Text>
      </View>

      <PrimaryButton onPress={() => navigation.navigate('WorkbookList')}>문제집 목록 보기</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    padding: 22,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  kicker: {
    marginBottom: 8,
    color: '#20C9C3',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#17183B',
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    color: '#7D8494',
    lineHeight: 20,
  },
});
