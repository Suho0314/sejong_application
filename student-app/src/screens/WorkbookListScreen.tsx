import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WorkbookCard } from '../components/WorkbookCard';
import type { Cohort, Workbook } from '../types/student';

type WorkbookListItem = Workbook & {
  progressRate: number;
};

type WorkbookListScreenProps = {
  cohort: Cohort;
  workbooks: WorkbookListItem[];
  onWorkbookPress: (workbookId: string) => void;
};

type WorkbookFilter = 'all' | 'active' | 'submitted';

const filterOptions: { id: WorkbookFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'active', label: '풀이 중' },
  { id: 'submitted', label: '완료' },
];

export function WorkbookListScreen({
  cohort,
  workbooks,
  onWorkbookPress,
}: WorkbookListScreenProps) {
  const [activeFilter, setActiveFilter] = useState<WorkbookFilter>('all');
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(
          workbooks
            .map((workbook) => workbook.subject.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right, 'ko')),
    [workbooks],
  );

  useEffect(() => {
    setActiveFilter('all');
    setActiveSubject('all');
  }, [cohort.id]);

  useEffect(() => {
    if (activeSubject !== 'all' && !subjects.includes(activeSubject)) {
      setActiveSubject('all');
    }
  }, [activeSubject, subjects]);

  const filteredWorkbooks = workbooks.filter((workbook) => {
    const workbookSubject = workbook.subject.trim();
    const matchesSubject = activeSubject === 'all' || workbookSubject === activeSubject;

    if (activeFilter === 'active') {
      return matchesSubject
        && (workbook.status === 'inProgress' || workbook.status === 'retrying');
    }

    if (activeFilter === 'submitted') {
      return matchesSubject && workbook.status === 'submitted';
    }

    return matchesSubject;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>{cohort.name}</Text>
        <Text style={styles.noticeDescription}>총 {workbooks.length}권의 문제집이 배포되었습니다.</Text>
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((option) => {
          const selected = activeFilter === option.id;

          return (
            <Pressable
              key={option.id}
              style={[styles.filterChip, selected && styles.activeChip]}
              onPress={() => setActiveFilter(option.id)}
            >
              <Text style={[styles.filterText, selected && styles.activeFilterText]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.subjectSection}>
        <Text style={styles.subjectLabel}>과목별 보기</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectRow}
        >
          {['all', ...subjects].map((subject) => {
            const selected = activeSubject === subject;

            return (
              <Pressable
                key={subject}
                style={[styles.subjectChip, selected && styles.activeSubjectChip]}
                onPress={() => setActiveSubject(subject)}
              >
                <Text style={[styles.subjectText, selected && styles.activeSubjectText]}>
                  {subject === 'all' ? '전체 과목' : subject}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {filteredWorkbooks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>해당하는 문제집이 없습니다</Text>
          <Text style={styles.emptyDescription}>다른 필터를 선택해 확인해 주세요.</Text>
        </View>
      ) : (
        filteredWorkbooks.map((workbook) => (
          <WorkbookCard
            key={workbook.id}
            workbook={workbook}
            progressRate={workbook.progressRate}
            onPress={() => onWorkbookPress(workbook.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF5',
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
    color: '#1A1F1B',
    fontSize: 17,
    fontWeight: '900',
  },
  noticeDescription: {
    marginTop: 6,
    color: '#66706A',
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
    borderWidth: 1,
    borderColor: '#DCE6DF',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  activeChip: {
    borderColor: '#0B9444',
    backgroundColor: '#0B9444',
  },
  filterText: {
    color: '#1A1F1B',
    fontWeight: '800',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  subjectSection: {
    marginBottom: 16,
  },
  subjectLabel: {
    marginBottom: 9,
    color: '#66706A',
    fontSize: 12,
    fontWeight: '800',
  },
  subjectRow: {
    gap: 8,
    paddingRight: 16,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DCE6DF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  activeSubjectChip: {
    borderColor: '#A9DDB9',
    backgroundColor: '#F3FBF5',
  },
  subjectText: {
    color: '#66706A',
    fontSize: 13,
    fontWeight: '700',
  },
  activeSubjectText: {
    color: '#087437',
    fontWeight: '900',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    color: '#1A1F1B',
    fontSize: 16,
    fontWeight: '900',
  },
  emptyDescription: {
    marginTop: 7,
    color: '#66706A',
    fontSize: 13,
  },
});
