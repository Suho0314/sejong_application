import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { WorkbookCard } from '../components/WorkbookCard';
import type { Cohort, Workbook } from '../types/student';

type WorkbookListScreenProps = {
  cohort: Cohort;
  workbooks: Workbook[];
  onWorkbookPress: (workbookId: string) => void;
};

export function WorkbookListScreen({
  cohort,
  workbooks,
  onWorkbookPress,
}: WorkbookListScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>{cohort.name}</Text>
        <Text style={styles.noticeDescription}>총 {workbooks.length}권의 문제집이 배포되었습니다.</Text>
      </View>

      <View style={styles.filterRow}>
        <Text style={[styles.filterChip, styles.activeChip]}>전체</Text>
        <Text style={styles.filterChip}>풀이 중</Text>
        <Text style={styles.filterChip}>완료</Text>
      </View>

      {workbooks.map((workbook) => (
        <WorkbookCard
          key={workbook.id}
          workbook={workbook}
          onPress={() => onWorkbookPress(workbook.id)}
        />
      ))}
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
  noticeCard: {
    marginBottom: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  noticeTitle: {
    color: '#172554',
    fontSize: 17,
    fontWeight: '900',
  },
  noticeDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    color: '#334155',
    backgroundColor: '#FFFFFF',
    fontWeight: '800',
  },
  activeChip: {
    color: '#FFFFFF',
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
});
