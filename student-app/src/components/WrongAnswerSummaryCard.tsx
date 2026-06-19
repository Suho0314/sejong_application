import { StyleSheet, Text, View } from 'react-native';

import type { WrongAnswerHistoryGroup } from '../types/student';

type WrongAnswerSummaryCardProps = {
  history: WrongAnswerHistoryGroup;
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WrongAnswerSummaryCard({ history }: WrongAnswerSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{history.workbookTitle}</Text>
        <Text style={styles.wrongBadge}>오답 {history.wrongAnswers.length}개</Text>
      </View>

      <Text style={styles.submittedAt}>
        최근 제출 {formatSubmittedAt(history.latestSubmittedAt)}
      </Text>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{history.latestScore}점</Text>
          <Text style={styles.statLabel}>최근 점수</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{history.latestCorrectRate}%</Text>
          <Text style={styles.statLabel}>최근 정답률</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.wrongValue]}>{history.wrongAnswers.length}</Text>
          <Text style={styles.statLabel}>누적 오답</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#172554',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 26,
  },
  wrongBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    fontSize: 11,
    fontWeight: '900',
  },
  submittedAt: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#1D4ED8',
    fontSize: 19,
    fontWeight: '900',
  },
  wrongValue: {
    color: '#DC2626',
  },
  statLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: '#E5E7EB',
  },
});
