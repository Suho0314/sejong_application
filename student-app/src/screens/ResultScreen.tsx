import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ResultSummaryCard } from '../components/ResultSummaryCard';
import { WrongAnswerCard } from '../components/WrongAnswerCard';
import { useAuth } from '../state/AuthContext';
import { useStudentData } from '../state/StudentDataContext';
import type { ScreenProps } from '../types/navigation';
import type { SubmissionResult } from '../types/student';

export function ResultScreen({ navigation, route }: ScreenProps<'Result'>) {
  const { user } = useAuth();
  const { errorMessage, getSubmissionResult, isLoading } = useStudentData();
  const [loadedResult, setLoadedResult] = useState<SubmissionResult | null>(route.params?.result ?? null);
  const submissionId = route.params?.submissionId;

  useEffect(() => {
    if (!loadedResult && submissionId) {
      getSubmissionResult(submissionId).then((result) => {
        if (result) setLoadedResult(result);
      });
    }
  }, [getSubmissionResult, loadedResult, submissionId]);

  const result = loadedResult;

  if (!result) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            {isLoading ? '성적 상세를 불러오는 중입니다' : '표시할 결과가 없습니다'}
          </Text>
          <Text style={styles.emptyDescription}>
            {errorMessage || '문제집을 제출한 뒤 결과 화면에서 점수와 오답을 확인할 수 있습니다.'}
          </Text>
          <PrimaryButton
            onPress={() =>
              navigation.navigate('Main', {
                cohortId: user?.cohortId ?? '',
                initialTab: 'workbooks',
                tabRequestKey: Date.now(),
              })
            }
          >
            문제집 목록으로
          </PrimaryButton>
        </View>
      </View>
    );
  }

  const wrongAnswers = (result.gradedAnswers ?? []).filter((answer) => !answer.isCorrect);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.kicker}>RESULT</Text>
          <Text style={styles.title}>{result.score}점</Text>
          <Text style={styles.workbookTitle}>{result.workbookTitle}</Text>
        </View>

        <ResultSummaryCard
          totalQuestions={result.totalQuestions}
          correctCount={result.correctCount}
          wrongCount={result.wrongCount}
          correctRate={result.correctRate}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>오답 확인</Text>
          <Text style={styles.sectionCount}>{wrongAnswers.length}문항</Text>
        </View>

        {wrongAnswers.length === 0 ? (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectTitle}>모든 문제를 맞혔어요!</Text>
            <Text style={styles.perfectDescription}>틀린 문제가 없어 오답 목록이 비어 있습니다.</Text>
          </View>
        ) : (
          <View style={styles.wrongList}>
            {wrongAnswers.map((answer, index) => (
              <WrongAnswerCard key={answer.questionId} answer={answer} index={index} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonItem}>
          <PrimaryButton
            variant="light"
            onPress={() =>
              navigation.navigate('Main', {
                cohortId: result.cohortId,
                initialTab: 'wrongAnswers',
                tabRequestKey: Date.now(),
              })
            }
          >
            오답정리
          </PrimaryButton>
        </View>
        <View style={styles.buttonItem}>
          <PrimaryButton
            onPress={() =>
              navigation.navigate('Main', {
                cohortId: result.cohortId,
                initialTab: 'workbooks',
                tabRequestKey: Date.now(),
              })
            }
          >
            문제집 목록
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF5',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 32,
    backgroundColor: '#E7F6EC',
  },
  icon: {
    color: '#087437',
    fontSize: 30,
    fontWeight: '900',
  },
  kicker: {
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 5,
    color: '#1A1F1B',
    fontSize: 48,
    fontWeight: '900',
  },
  workbookTitle: {
    marginTop: 6,
    color: '#66706A',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#1A1F1B',
    fontSize: 19,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#D14343',
    fontSize: 13,
    fontWeight: '900',
  },
  wrongList: {
    gap: 12,
  },
  perfectCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#F3FBF5',
  },
  perfectTitle: {
    color: '#087437',
    fontSize: 17,
    fontWeight: '900',
  },
  perfectDescription: {
    marginTop: 7,
    color: '#66706A',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#DCE6DF',
    backgroundColor: '#FFFFFF',
  },
  buttonItem: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F3FBF5',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    color: '#1A1F1B',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 9,
    marginBottom: 22,
    color: '#66706A',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
