import { StyleSheet, Text, View } from 'react-native';

type ResultSummaryCardProps = {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
};

export function ResultSummaryCard({
  totalQuestions,
  correctCount,
  wrongCount,
  correctRate,
}: ResultSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.rateArea}>
        <Text style={styles.rateLabel}>정답률</Text>
        <Text style={styles.rate}>{correctRate}%</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalQuestions}</Text>
          <Text style={styles.statLabel}>전체</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.correct]}>{correctCount}</Text>
          <Text style={styles.statLabel}>정답</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.wrong]}>{wrongCount}</Text>
          <Text style={styles.statLabel}>오답</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  rateArea: {
    alignItems: 'center',
  },
  rateLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  rate: {
    marginTop: 5,
    color: '#1D4ED8',
    fontSize: 40,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    marginVertical: 20,
    backgroundColor: '#E5E7EB',
  },
  stats: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#172554',
    fontSize: 22,
    fontWeight: '900',
  },
  correct: {
    color: '#2563EB',
  },
  wrong: {
    color: '#DC2626',
  },
  statLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
});
