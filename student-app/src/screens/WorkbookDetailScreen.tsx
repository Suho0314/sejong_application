import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../state/AuthContext';
import { useSolveProgress } from '../state/SolveProgressContext';
import { useStudentData } from '../state/StudentDataContext';
import type { ScreenProps } from '../types/navigation';
import type { Workbook } from '../types/student';
import {
  getWorkbookActionLabel,
  isActiveWorkbookStatus,
  resolveWorkbookStatus,
  workbookStatusLabel,
} from '../utils/workbookStatus';

export function WorkbookDetailScreen({ navigation, route }: ScreenProps<'WorkbookDetail'>) {
  const { isAuthenticated } = useAuth();
  const { errorMessage, getWorkbookDetail, isLoading, workbooks } = useStudentData();
  const [workbook, setWorkbook] = useState<Workbook | null>(
    () => workbooks.find((item) => item.id === route.params.workbookId) ?? null,
  );
  const { getProgress } = useSolveProgress();
  const solveProgress = getProgress(route.params.workbookId);

  useEffect(() => {
    getWorkbookDetail(route.params.workbookId).then((detail) => {
      if (detail) setWorkbook(detail);
    });
  }, [getWorkbookDetail, route.params.workbookId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  if (!workbook) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {isLoading ? '문제집을 불러오는 중입니다.' : '문제집을 찾을 수 없습니다.'}
        </Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <PrimaryButton onPress={() => navigation.goBack()}>목록으로 돌아가기</PrimaryButton>
      </View>
    );
  }

  const questions = Array.isArray(workbook.questions) ? workbook.questions : [];
  const questionCount = questions.length;
  const hasQuestions = questionCount > 0;
  const effectiveStatus = resolveWorkbookStatus(workbook, solveProgress);
  const buttonLabel = getWorkbookActionLabel(effectiveStatus);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.subject}>{workbook.subject ?? '간호학'}</Text>
            <Text style={styles.status}>{workbookStatusLabel[effectiveStatus]}</Text>
          </View>
          <Text style={styles.title}>{workbook.title ?? '제목 없는 문제집'}</Text>
          <Text style={styles.description}>{workbook.description ?? '배포된 문제집입니다.'}</Text>
        </View>

        {isActiveWorkbookStatus(effectiveStatus) && solveProgress ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              {solveProgress.status === 'retrying' ? '다시 푸는 중' : '풀이 진행 중'}
            </Text>
            <Text style={styles.progressDescription}>
              {solveProgress.currentQuestionIndex + 1}번 문제부터 이어서 풀 수 있습니다.
              {' '}저장된 답안 {solveProgress.answers.length}개
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>문제집 정보</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{questionCount || workbook.totalQuestions || 0}</Text>
              <Text style={styles.infoLabel}>총 문항</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{workbook.estimatedMinutes ?? 0}분</Text>
              <Text style={styles.infoLabel}>예상 시간</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{workbook.chapterCount ?? 0}</Text>
              <Text style={styles.infoLabel}>챕터</Text>
            </View>
          </View>
        </View>

        {hasQuestions ? (
          <View style={styles.guideCard}>
            <Text style={styles.sectionTitle}>풀이 안내</Text>
            <Text style={styles.guideText}>• 선택한 답안은 문제를 이동해도 유지됩니다.</Text>
            <Text style={styles.guideText}>• 마지막 문제에서 제출할 수 있습니다.</Text>
            <Text style={styles.guideText}>• 진행 상태는 앱을 종료하기 전까지 임시 저장됩니다.</Text>
          </View>
        ) : (
          <View style={styles.emptyQuestionCard}>
            <Text style={styles.emptyQuestionTitle}>문항이 없습니다</Text>
            <Text style={styles.emptyQuestionDescription}>
              배포된 문제집에 문항이 추가된 뒤 다시 풀이할 수 있습니다.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          disabled={!hasQuestions}
          onPress={() => navigation.navigate('WorkbookSolve', { workbookId: workbook.id })}
        >
          {hasQuestions ? buttonLabel : '문항이 없습니다'}
        </PrimaryButton>
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
  heroCard: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subject: {
    color: '#0B9444',
    fontSize: 13,
    fontWeight: '900',
  },
  status: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#087437',
    backgroundColor: '#E7F6EC',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 18,
    color: '#1A1F1B',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 36,
  },
  description: {
    marginTop: 12,
    color: '#66706A',
    fontSize: 15,
    lineHeight: 23,
  },
  infoCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    marginBottom: 18,
    color: '#1A1F1B',
    fontSize: 17,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    color: '#087437',
    fontSize: 22,
    fontWeight: '900',
  },
  infoLabel: {
    marginTop: 5,
    color: '#66706A',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 42,
    backgroundColor: '#DCE6DF',
  },
  guideCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#F3FBF5',
  },
  progressCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#A9DDB9',
    borderRadius: 20,
    backgroundColor: '#F3FBF5',
  },
  progressTitle: {
    color: '#087437',
    fontSize: 15,
    fontWeight: '900',
  },
  progressDescription: {
    marginTop: 7,
    color: '#66706A',
    fontSize: 13,
    lineHeight: 20,
  },
  guideText: {
    marginBottom: 8,
    color: '#1A1F1B',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyQuestionCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE6DF',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  emptyQuestionTitle: {
    color: '#1A1F1B',
    fontSize: 17,
    fontWeight: '900',
  },
  emptyQuestionDescription: {
    marginTop: 8,
    color: '#66706A',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#DCE6DF',
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    padding: 24,
    backgroundColor: '#F3FBF5',
  },
  emptyTitle: {
    color: '#1A1F1B',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorText: {
    color: '#D14343',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
