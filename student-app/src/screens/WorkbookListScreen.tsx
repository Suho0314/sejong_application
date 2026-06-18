import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { mockWorkbooks } from '../mock/workbooks';
import type { ScreenProps } from '../types/navigation';

export function WorkbookListScreen({ navigation }: ScreenProps<'WorkbookList'>) {
  return (
    <Screen>
      <Text style={styles.title}>문제집 목록</Text>
      <Text style={styles.description}>실제 문제집 데이터 연결 전 최소 mock 데이터 1건만 표시합니다.</Text>

      {mockWorkbooks.map((workbook) => (
        <Pressable
          key={workbook.id}
          style={styles.card}
          onPress={() => navigation.navigate('WorkbookSolve', { workbookId: workbook.id })}
        >
          <View>
            <Text style={styles.cardTitle}>{workbook.title}</Text>
            <Text style={styles.meta}>
              챕터 {workbook.chapterCount} · 문제 {workbook.questionCount}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
    color: '#17183B',
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    marginBottom: 18,
    color: '#7D8494',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    color: '#17183B',
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    marginTop: 6,
    color: '#7D8494',
  },
  chevron: {
    color: '#A1A7B3',
    fontSize: 30,
  },
});
