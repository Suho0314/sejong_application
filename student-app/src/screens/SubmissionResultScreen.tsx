import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { mockWorkbooks } from '../mock/studentMockData';
import type { ScreenProps } from '../types/navigation';

export function SubmissionResultScreen({ navigation, route }: ScreenProps<'SubmissionResult'>) {
  const workbook = mockWorkbooks.find((item) => item.id === route.params.workbookId);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>✓</Text>
      </View>
      <Text style={styles.kicker}>SUBMITTED</Text>
      <Text style={styles.title}>답안을 제출했습니다</Text>
      <Text style={styles.workbookTitle}>{workbook?.title ?? '문제집'}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{route.params.answeredCount}</Text>
          <Text style={styles.summaryLabel}>응답 문항</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{workbook?.totalQuestions ?? 0}</Text>
          <Text style={styles.summaryLabel}>전체 문항</Text>
        </View>
      </View>

      <Text style={styles.notice}>이번 데모에서는 자동 채점과 제출 기록 저장을 하지 않습니다.</Text>

      <View style={styles.buttons}>
        <PrimaryButton
          onPress={() =>
            navigation.navigate('Main', { cohortId: workbook?.cohortId ?? 'cohort-2026-05' })
          }
        >
          문제집 목록으로
        </PrimaryButton>
        <PrimaryButton
          variant="light"
          onPress={() => navigation.replace('WorkbookSolve', { workbookId: route.params.workbookId })}
        >
          다시 풀기
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  iconCircle: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderRadius: 39,
    backgroundColor: '#DBEAFE',
  },
  icon: {
    color: '#1D4ED8',
    fontSize: 36,
    fontWeight: '900',
  },
  kicker: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    color: '#172554',
    fontSize: 28,
    fontWeight: '900',
  },
  workbookTitle: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 28,
    padding: 22,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#1D4ED8',
    fontSize: 26,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: '#E5E7EB',
  },
  notice: {
    marginTop: 18,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    marginTop: 28,
    gap: 10,
  },
});
