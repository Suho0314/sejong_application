import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { Screen } from '../components/Screen';
import type { ScreenProps } from '../types/navigation';

export function WorkbookSolveScreen({ navigation, route }: ScreenProps<'WorkbookSolve'>) {
  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.kicker}>문제 풀이</Text>
        <Text style={styles.title}>문제 풀이 화면</Text>
        <Text style={styles.description}>
          선택된 문제집 ID: {route.params?.workbookId ?? '없음'}
        </Text>
        <Text style={styles.description}>문제 표시와 답안 선택 로직은 다음 이슈에서 연결합니다.</Text>
      </View>

      <PrimaryButton
        onPress={() =>
          navigation.navigate('Result', {
            workbookId: route.params?.workbookId,
            score: 0,
          })
        }
      >
        결과 화면으로 이동
      </PrimaryButton>
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
