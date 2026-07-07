import { StyleSheet, Text, View } from 'react-native';

type ScoreSummaryCardProps = {
  correctRate: number;
  solvedWorkbookCount: number;
  correctCount: number;
};

export function ScoreSummaryCard({
  correctRate,
  solvedWorkbookCount,
  correctCount,
}: ScoreSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>전체 정답률</Text>
      <Text style={styles.rate}>{correctRate}%</Text>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{solvedWorkbookCount}</Text>
          <Text style={styles.statLabel}>풀이 권수</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{correctCount}</Text>
          <Text style={styles.statLabel}>정답 수</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#087437',
  },
  label: {
    color: '#BFE8CB',
    fontSize: 13,
    fontWeight: '700',
  },
  rate: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.24)',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    color: '#BFE8CB',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 42,
    marginHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
});
