import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Workbook } from '../types/student';

type WorkbookCardProps = {
  workbook: Workbook;
};

const statusText: Record<Workbook['status'], string> = {
  notStarted: '미풀이',
  inProgress: '풀이 중',
  completed: '완료',
};

export function WorkbookCard({ workbook }: WorkbookCardProps) {
  const rate = workbook.correctRate ?? 0;

  return (
    <Pressable style={styles.card}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.subject}>{workbook.subject}</Text>
          <Text style={[styles.status, workbook.status === 'completed' && styles.completedStatus]}>
            {statusText[workbook.status]}
          </Text>
        </View>

        <Text style={styles.title}>{workbook.title}</Text>
        <Text style={styles.meta}>
          챕터 {workbook.chapterCount} · 문제 {workbook.questionCount}
        </Text>

        <View style={styles.rateRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${rate}%` }]} />
          </View>
          <Text style={styles.rateText}>{workbook.correctRate == null ? '-' : `${rate}%`}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  content: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subject: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
  },
  completedStatus: {
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
  },
  title: {
    color: '#172554',
    fontSize: 19,
    fontWeight: '800',
  },
  meta: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  rateText: {
    width: 42,
    color: '#172554',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
