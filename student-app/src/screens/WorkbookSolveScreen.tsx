import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { QuestionCard } from '../components/QuestionCard';
import { mockWorkbooks } from '../mock/studentMockData';
import { useSolveProgress } from '../state/SolveProgressContext';
import { useSubmissionHistory } from '../state/SubmissionHistoryContext';
import type { ScreenProps } from '../types/navigation';
import type { StudentAnswer } from '../types/student';
import { gradeWorkbook } from '../utils/gradeWorkbook';
import { createInitialSolveState, upsertStudentAnswer } from '../utils/solveProgress';
import { getStartProgressStatus, resolveWorkbookStatus } from '../utils/workbookStatus';

export function WorkbookSolveScreen({ navigation, route }: ScreenProps<'WorkbookSolve'>) {
  const workbook = mockWorkbooks.find((item) => item.id === route.params.workbookId);
  const { addSubmission } = useSubmissionHistory();
  const { getProgress, saveProgress, startProgress, submitProgress } = useSolveProgress();
  const savedProgress = getProgress(route.params.workbookId);
  const initialState = workbook
    ? createInitialSolveState(workbook, savedProgress)
    : { currentQuestionIndex: 0, answers: [] as StudentAnswer[] };
  const [currentIndex, setCurrentIndex] = useState(initialState.currentQuestionIndex);
  const [answers, setAnswers] = useState<StudentAnswer[]>(initialState.answers);

  useEffect(() => {
    if (workbook) {
      const status = resolveWorkbookStatus(workbook, savedProgress);
      const startStatus = getStartProgressStatus(status);

      startProgress(workbook.id, startStatus);
    }
  }, [savedProgress, startProgress, workbook]);

  if (!workbook || workbook.questions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>풀이할 문제가 없습니다.</Text>
        <PrimaryButton onPress={() => navigation.goBack()}>돌아가기</PrimaryButton>
      </View>
    );
  }

  const currentQuestion = workbook.questions[currentIndex];
  const currentAnswer = answers.find((answer) => answer.questionId === currentQuestion.id);
  const isLastQuestion = currentIndex === workbook.questions.length - 1;
  const progress = ((currentIndex + 1) / workbook.questions.length) * 100;

  const selectChoice = (selectedChoiceId: string) => {
    const nextAnswers = upsertStudentAnswer(answers, currentQuestion.id, selectedChoiceId);

    setAnswers(nextAnswers);
    saveProgress(workbook.id, currentIndex, nextAnswers);
  };

  const moveToQuestion = (nextIndex: number) => {
    setCurrentIndex(nextIndex);
    saveProgress(workbook.id, nextIndex, answers);
  };

  const submit = () => {
    const result = gradeWorkbook(workbook, answers);

    addSubmission(result);
    submitProgress(workbook.id, answers);
    navigation.replace('Result', { result });
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <View style={styles.countRow}>
          <Text style={styles.workbookTitle} numberOfLines={1}>{workbook.title}</Text>
          <Text style={styles.count}>{currentIndex + 1} / {workbook.questions.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          selectedChoiceId={currentAnswer?.selectedChoiceId}
          onSelectChoice={selectChoice}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonItem}>
          <PrimaryButton
            variant="light"
            disabled={currentIndex === 0}
            onPress={() => moveToQuestion(currentIndex - 1)}
          >
            이전 문제
          </PrimaryButton>
        </View>
        <View style={styles.buttonItem}>
          {isLastQuestion ? (
            <PrimaryButton disabled={!currentAnswer} onPress={submit}>제출하기</PrimaryButton>
          ) : (
            <PrimaryButton
              disabled={!currentAnswer}
              onPress={() => moveToQuestion(currentIndex + 1)}
            >
              다음 문제
            </PrimaryButton>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  progressHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workbookTitle: {
    flex: 1,
    marginRight: 16,
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  count: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  buttonItem: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  emptyTitle: {
    color: '#172554',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
});
