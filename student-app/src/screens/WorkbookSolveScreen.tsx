import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { QuestionCard } from '../components/QuestionCard';
import { useAuth } from '../state/AuthContext';
import { useSolveProgress } from '../state/SolveProgressContext';
import { useStudentData } from '../state/StudentDataContext';
import type { ScreenProps } from '../types/navigation';
import type { StudentAnswer, Workbook } from '../types/student';
import { createInitialSolveState, upsertStudentAnswer } from '../utils/solveProgress';
import { showAlert } from '../utils/showAlert';
import {
  ATTEMPT_LIMIT_MESSAGE,
  hasReachedAttemptLimit,
  isAttemptLimitExceededError,
} from '../utils/submissionAttempt';
import { getStartProgressStatus, resolveWorkbookStatus } from '../utils/workbookStatus';

export function WorkbookSolveScreen({ navigation, route }: ScreenProps<'WorkbookSolve'>) {
  const { isAuthenticated } = useAuth();
  const { errorMessage, getWorkbookDetail, isLoading, submitWorkbook, workbooks } = useStudentData();
  const [workbook, setWorkbook] = useState<Workbook | null>(
    () => workbooks.find((item) => item.id === route.params.workbookId) ?? null,
  );
  const { getProgress, saveProgress, startProgress, submitProgress } = useSolveProgress();
  const savedProgress = getProgress(route.params.workbookId);
  const initialState = workbook
    ? createInitialSolveState(workbook, savedProgress)
    : { currentQuestionIndex: 0, answers: [] as StudentAnswer[] };
  const [currentIndex, setCurrentIndex] = useState(initialState.currentQuestionIndex);
  const [answers, setAnswers] = useState<StudentAnswer[]>(initialState.answers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    getWorkbookDetail(route.params.workbookId).then((detail) => {
      if (detail) {
        setWorkbook(detail);
        const nextInitialState = createInitialSolveState(detail, savedProgress);
        setCurrentIndex(nextInitialState.currentQuestionIndex);
        setAnswers(nextInitialState.answers);
      }
    });
  }, [getWorkbookDetail, route.params.workbookId, savedProgress]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (workbook) {
      const status = resolveWorkbookStatus(workbook, savedProgress);
      const startStatus = getStartProgressStatus(status);

      startProgress(workbook.id, startStatus);
    }
  }, [savedProgress, startProgress, workbook]);

  const questions = Array.isArray(workbook?.questions) ? workbook.questions : [];

  if (!workbook || questions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {isLoading ? '문제를 불러오는 중입니다.' : '문항이 없습니다'}
        </Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <PrimaryButton onPress={() => navigation.goBack()}>돌아가기</PrimaryButton>
      </View>
    );
  }

  const safeCurrentIndex = Math.min(Math.max(currentIndex, 0), questions.length - 1);
  const currentQuestion = questions[safeCurrentIndex];
  const currentAnswer = answers.find((answer) => answer.questionId === currentQuestion.id);
  const isLastQuestion = safeCurrentIndex === questions.length - 1;
  const progress = ((safeCurrentIndex + 1) / questions.length) * 100;

  const selectChoice = (selectedChoiceId: string) => {
    const nextAnswers = upsertStudentAnswer(answers, currentQuestion.id, selectedChoiceId);

    setAnswers(nextAnswers);
    saveProgress(workbook.id, safeCurrentIndex, nextAnswers);
  };

  const moveToQuestion = (nextIndex: number) => {
    const safeNextIndex = Math.min(Math.max(nextIndex, 0), questions.length - 1);

    setCurrentIndex(safeNextIndex);
    saveProgress(workbook.id, safeNextIndex, answers);
  };

  const submit = async () => {
    if (submittingRef.current) return;

    if (hasReachedAttemptLimit(workbook)) {
      showAlert(ATTEMPT_LIMIT_MESSAGE);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await submitWorkbook(workbook.id, answers.map((answer) => ({
        workbookQuestionId: answer.questionId,
        selectedChoiceId: answer.selectedChoiceId,
      })));

      submitProgress(workbook.id, answers);
      navigation.replace('Result', { result });
    } catch (error) {
      if (isAttemptLimitExceededError(error)) {
        showAlert(ATTEMPT_LIMIT_MESSAGE);
      } else {
        showAlert('제출 중 오류가 발생했습니다. 다시 시도해주세요.', '제출 실패');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <View style={styles.countRow}>
          <Text style={styles.workbookTitle} numberOfLines={1}>{workbook.title}</Text>
          <Text style={styles.count}>{safeCurrentIndex + 1} / {questions.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <QuestionCard
          question={currentQuestion}
          questionNumber={safeCurrentIndex + 1}
          selectedChoiceId={currentAnswer?.selectedChoiceId}
          onSelectChoice={selectChoice}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonItem}>
          <PrimaryButton
            variant="light"
            disabled={safeCurrentIndex === 0 || isSubmitting}
            onPress={() => moveToQuestion(safeCurrentIndex - 1)}
          >
            이전 문제
          </PrimaryButton>
        </View>
        <View style={styles.buttonItem}>
          {isLastQuestion ? (
            <PrimaryButton disabled={!currentAnswer || isSubmitting} onPress={submit}>
              {isSubmitting ? '제출 중...' : '제출하기'}
            </PrimaryButton>
          ) : (
            <PrimaryButton
              disabled={!currentAnswer}
              onPress={() => moveToQuestion(safeCurrentIndex + 1)}
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
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
