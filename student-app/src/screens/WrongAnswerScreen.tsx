import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WrongAnswerCard } from '../components/WrongAnswerCard';
import { WrongAnswerSummaryCard } from '../components/WrongAnswerSummaryCard';
import type { SubmissionRecord } from '../types/student';
import { buildWrongAnswerHistory } from '../utils/wrongAnswerHistory';

type WrongAnswerScreenProps = {
  cohortId: string;
  submissions: SubmissionRecord[];
};

export function WrongAnswerScreen({ cohortId, submissions }: WrongAnswerScreenProps) {
  const wrongAnswerHistory = useMemo(
    () => buildWrongAnswerHistory(submissions, cohortId),
    [cohortId, submissions],
  );
  const [expandedWorkbookIds, setExpandedWorkbookIds] = useState<Set<string>>(new Set());
  const initializedDefaultKey = useRef<string | null>(null);
  const mostRecentGroup = wrongAnswerHistory[0];
  const defaultGroupKey = mostRecentGroup
    ? `${cohortId}:${mostRecentGroup.workbookId}:${mostRecentGroup.latestSubmittedAt}`
    : `${cohortId}:empty`;

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
        <Text style={styles.heroTitle}>틀린 문제를 다시 확인해요</Text>
        <Text style={styles.heroDescription}>
          제출한 문제집별 점수와 오답을 앱을 종료하기 전까지 확인할 수 있습니다.
        </Text>
      </View>

      {wrongAnswerHistory.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>아직 오답이 없습니다.</Text>
          <Text style={styles.emptyDescription}>
            문제집을 제출하고 틀린 문제가 생기면 이곳에 표시됩니다.
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {wrongAnswerHistory.map((history) => {
            const isExpanded = expandedWorkbookIds.has(history.workbookId);

            return (
              <View key={history.workbookId} style={styles.historyGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={`${history.workbookTitle}, 오답 ${history.wrongAnswers.length}개`}
                  onPress={() => toggleWorkbookGroup(history.workbookId)}
                >
                  <WrongAnswerSummaryCard history={history} isExpanded={isExpanded} />
                </Pressable>

                {isExpanded ? (
                  <View style={styles.answerList}>
                    {history.wrongAnswers.map((answer, index) => (
                      <WrongAnswerCard
                        key={answer.questionId}
                        answer={answer}
                        index={index}
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
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  heroCard: {
    marginBottom: 14,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
  },
  heroTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '900',
  },
  heroDescription: {
    marginTop: 8,
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 19,
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
    borderLeftColor: '#BFDBFE',
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
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyTitle: {
    marginTop: 18,
    color: '#172554',
    fontSize: 18,
    fontWeight: '900',
  },
  emptyDescription: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
