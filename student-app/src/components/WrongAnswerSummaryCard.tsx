import { StyleSheet, Text, View } from 'react-native';

import type { WrongAnswerHistoryGroup } from '../types/student';

type WrongAnswerSummaryCardProps = {
  history: WrongAnswerHistoryGroup;
  isExpanded: boolean;
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

export function WrongAnswerSummaryCard({ history, isExpanded }: WrongAnswerSummaryCardProps) {
  const answerCount = history.answers.length;
  const isCorrectMode = history.reviewMode === 'correct';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{history.workbookTitle}</Text>
        <View style={styles.headerActions}>
          <Text style={[styles.answerBadge, isCorrectMode ? styles.correctBadge : styles.wrongBadge]}>
            {isCorrectMode ? '정답' : '오답'} {answerCount}개
          </Text>
          <View style={styles.toggleIcon}>
            <Text style={styles.toggleIconText}>{isExpanded ? '⌃' : '⌄'}</Text>
          </View>
        </View>
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
          <Text style={[styles.statValue, isCorrectMode ? styles.correctValue : styles.wrongValue]}>
            {answerCount}
          </Text>
          <Text style={styles.statLabel}>누적 {isCorrectMode ? '정답' : '오답'}</Text>
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
    color: '#1A1F1B',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 26,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
  },
  wrongBadge: {
    color: '#D14343',
    backgroundColor: '#FDECEC',
  },
  correctBadge: {
    color: '#087437',
    backgroundColor: '#E7F6EC',
  },
  toggleIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F3FBF5',
  },
  toggleIconText: {
    color: '#0B9444',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  submittedAt: {
    marginTop: 7,
    color: '#66706A',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DCE6DF',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#087437',
    fontSize: 19,
    fontWeight: '900',
  },
  correctValue: {
    color: '#087437',
  },
  wrongValue: {
    color: '#D14343',
  },
  statLabel: {
    marginTop: 4,
    color: '#66706A',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: '#DCE6DF',
  },
});
