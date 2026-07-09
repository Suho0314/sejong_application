import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Workbook } from '../types/student';
import { workbookStatusLabel } from '../utils/workbookStatus';

type WorkbookCardProps = {
  workbook: Workbook;
  progressRate: number;
  onPress: () => void;
};

export function WorkbookCard({ workbook, progressRate, onPress }: WorkbookCardProps) {
  const subject = workbook.subject.trim();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          {subject ? <Text style={styles.subject}>{subject}</Text> : <View />}
          <Text
            style={[
              styles.status,
              workbook.status === 'submitted' && styles.submittedStatus,
              workbook.status === 'retrying' && styles.retryingStatus,
            ]}
          >
            {workbookStatusLabel[workbook.status]}
          </Text>
        </View>

        <Text style={styles.title}>{workbook.title}</Text>
        <Text style={styles.meta}>
          챕터 {workbook.chapterCount} · 문제 {workbook.totalQuestions}
        </Text>

        <View style={styles.rateRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRate}%` }]} />
          </View>
          <Text style={styles.rateText}>진행 {progressRate}%</Text>
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
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    color: '#66706A',
    backgroundColor: '#F1F5F9',
    fontSize: 12,
    fontWeight: '800',
  },
  submittedStatus: {
    color: '#087437',
    backgroundColor: '#E7F6EC',
  },
  retryingStatus: {
    color: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  title: {
    color: '#1A1F1B',
    fontSize: 19,
    fontWeight: '800',
  },
  meta: {
    color: '#66706A',
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
    backgroundColor: '#DCE6DF',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0B9444',
  },
  rateText: {
    width: 62,
    color: '#1A1F1B',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
