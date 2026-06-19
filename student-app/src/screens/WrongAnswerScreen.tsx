import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Workbook, WorkbookResult } from '../types/student';

type WrongAnswerScreenProps = {
  results: WorkbookResult[];
  workbooks: Workbook[];
};

export function WrongAnswerScreen({ results, workbooks }: WrongAnswerScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>틀린 문제를 다시 확인해요</Text>
        <Text style={styles.heroDescription}>문제집별 정답률과 오답 개수를 한눈에 볼 수 있습니다.</Text>
      </View>

      {results.map((result) => {
        const workbook = workbooks.find((item) => item.id === result.workbookId);

        if (!workbook) {
          return null;
        }

        return (
          <View key={result.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.subject}>{workbook.subject}</Text>
              <Text style={styles.wrongCount}>오답 {result.wrongCount}개</Text>
            </View>
            <Text style={styles.title}>{workbook.title}</Text>
            <Text style={styles.meta}>{result.submittedAt} 제출</Text>

            <View style={styles.rateRow}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${result.correctRate}%` }]} />
              </View>
              <Text style={styles.rate}>{result.correctRate}%</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  heroCard: {
    marginBottom: 14,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
  },
  heroTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '900',
  },
  heroDescription: {
    marginTop: 8,
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subject: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  wrongCount: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 10,
    color: '#172554',
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  track: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  rate: {
    width: 42,
    color: '#172554',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
});
