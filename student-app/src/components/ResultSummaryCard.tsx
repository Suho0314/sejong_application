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
    color: '#66706A',
    fontSize: 13,
    fontWeight: '700',
  },
  rate: {
    marginTop: 5,
    color: '#087437',
    fontSize: 40,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    marginVertical: 20,
    backgroundColor: '#DCE6DF',
  },
  stats: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#1A1F1B',
    fontSize: 22,
    fontWeight: '900',
  },
  correct: {
    color: '#0B9444',
  },
  wrong: {
    color: '#D14343',
  },
  statLabel: {
    marginTop: 4,
    color: '#66706A',
    fontSize: 12,
    fontWeight: '700',
  },
});
