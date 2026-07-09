import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WrongAnswerCard } from '../components/WrongAnswerCard';
import { WrongAnswerSummaryCard } from '../components/WrongAnswerSummaryCard';
import type { AnswerReviewMode, SubmissionRecord } from '../types/student';
import { buildWrongAnswerHistory } from '../utils/wrongAnswerHistory';

type WrongAnswerScreenProps = {
  cohortId: string;
  submissions: SubmissionRecord[];
};

const reviewFilters: Array<{
  id: AnswerReviewMode;
  label: string;
}> = [
  { id: 'incorrect', label: '틀린 문제 보기' },
  { id: 'correct', label: '맞은 문제 보기' },
];

export function WrongAnswerScreen({ cohortId, submissions }: WrongAnswerScreenProps) {
  const [reviewMode, setReviewMode] = useState<AnswerReviewMode>('incorrect');
  const answerHistory = useMemo(
    () => buildWrongAnswerHistory(submissions, cohortId, reviewMode),
    [cohortId, reviewMode, submissions],
  );
  const [expandedWorkbookIds, setExpandedWorkbookIds] = useState<Set<string>>(new Set());
  const initializedDefaultKey = useRef<string | null>(null);
  const mostRecentGroup = answerHistory[0];
  const defaultGroupKey = mostRecentGroup
    ? `${cohortId}:${reviewMode}:${mostRecentGroup.workbookId}:${mostRecentGroup.latestSubmittedAt}`
    : `${cohortId}:${reviewMode}:empty`;
  const isCorrectMode = reviewMode === 'correct';

  useEffect(() => {
    if (initializedDefaultKey.current === defaultGroupKey) return;

    initializedDefaultKey.current = defaultGroupKey;
    setExpandedWorkbookIds(
      mostRecentGroup ? new Set([mostRecentGroup.workbookId]) : new Set(),
    );
  }, [defaultGroupKey, mostRecentGroup]);

  const toggleWorkbookGroup = (workbookId: string) => {
    setExpandedWorkbookIds((current) => {
      const next = new Set(current);

      if (next.has(workbookId)) {
        next.delete(workbookId);
      } else {
        next.add(workbookId);
      }

      return next;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {isCorrectMode ? '맞은 문제도 다시 확인해요' : '틀린 문제를 다시 확인해요'}
        </Text>
        <Text style={styles.heroDescription}>
          제출한 문제집별 점수와 {isCorrectMode ? '정답 문항' : '오답'}을 앱을 종료하기 전까지 확인할 수 있습니다.
        </Text>
      </View>

      <View style={styles.filterTabs}>
        {reviewFilters.map((filter) => {
          const selected = reviewMode === filter.id;

          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.filterButton, selected && styles.selectedFilterButton]}
              onPress={() => setReviewMode(filter.id)}
            >
              <Text style={[styles.filterText, selected && styles.selectedFilterText]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {answerHistory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>
            {isCorrectMode ? '맞은 문제가 없습니다.' : '틀린 문제가 없습니다.'}
          </Text>
          <Text style={styles.emptyDescription}>
            {isCorrectMode
              ? '문제집을 제출하고 맞은 문제가 생기면 이곳에 표시됩니다.'
              : '문제집을 제출하고 틀린 문제가 생기면 이곳에 표시됩니다.'}
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {answerHistory.map((history) => {
            const isExpanded = expandedWorkbookIds.has(history.workbookId);
            const answerCount = history.answers.length;

            return (
              <View key={history.workbookId} style={styles.historyGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={`${history.workbookTitle}, ${isCorrectMode ? '정답' : '오답'} ${answerCount}개`}
                  onPress={() => toggleWorkbookGroup(history.workbookId)}
                >
                  <WrongAnswerSummaryCard history={history} isExpanded={isExpanded} />
                </Pressable>

                {isExpanded ? (
                  <View style={styles.answerList}>
                    {history.answers.map((answer) => (
                      <WrongAnswerCard
                        key={answer.questionId}
                        answer={answer}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
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
  heroCard: {
    marginBottom: 14,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#E7F6EC',
  },
  heroTitle: {
    color: '#087437',
    fontSize: 18,
    fontWeight: '900',
  },
  heroDescription: {
    marginTop: 8,
    color: '#087437',
    fontSize: 13,
    lineHeight: 19,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#DCE6DF',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BFE8CB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  selectedFilterButton: {
    borderColor: '#0B9444',
    backgroundColor: '#0B9444',
  },
  filterText: {
    color: '#087437',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },
  historyList: {
    gap: 20,
  },
  historyGroup: {
    gap: 10,
  },
  answerList: {
    gap: 10,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#BFE8CB',
  },
  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 42,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  emptyIcon: {
    width: 54,
    height: 54,
    paddingTop: 9,
    overflow: 'hidden',
    borderRadius: 27,
    color: '#087437',
    backgroundColor: '#E7F6EC',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyTitle: {
    marginTop: 18,
    color: '#1A1F1B',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyDescription: {
    marginTop: 8,
    color: '#66706A',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
