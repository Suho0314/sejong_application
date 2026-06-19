import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { mockWorkbooks } from '../mock/studentMockData';
import type { ScreenProps } from '../types/navigation';
import type { WorkbookStatus } from '../types/student';

const statusText: Record<WorkbookStatus, string> = {
  notStarted: '미풀이',
  inProgress: '풀이 중',
  completed: '완료',
};

export function WorkbookDetailScreen({ navigation, route }: ScreenProps<'WorkbookDetail'>) {
  const workbook = mockWorkbooks.find((item) => item.id === route.params.workbookId);

  if (!workbook) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>문제집을 찾을 수 없습니다.</Text>
        <PrimaryButton onPress={() => navigation.goBack()}>목록으로 돌아가기</PrimaryButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.subject}>{workbook.subject}</Text>
            <Text style={styles.status}>{statusText[workbook.status]}</Text>
          </View>
          <Text style={styles.title}>{workbook.title}</Text>
          <Text style={styles.description}>{workbook.description}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>문제집 정보</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{workbook.totalQuestions}</Text>
              <Text style={styles.infoLabel}>총 문항</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{workbook.estimatedMinutes}분</Text>
              <Text style={styles.infoLabel}>예상 시간</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoValue}>{workbook.chapterCount}</Text>
              <Text style={styles.infoLabel}>챕터</Text>
            </View>
          </View>
        </View>

        <View style={styles.guideCard}>
          <Text style={styles.sectionTitle}>풀이 안내</Text>
          <Text style={styles.guideText}>• 선택한 답안은 문제를 이동해도 유지됩니다.</Text>
          <Text style={styles.guideText}>• 마지막 문제에서 제출할 수 있습니다.</Text>
          <Text style={styles.guideText}>• 이번 데모에서는 실제 채점과 저장을 하지 않습니다.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          onPress={() => navigation.navigate('WorkbookSolve', { workbookId: workbook.id })}
        >
          풀이 시작
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  status: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    marginTop: 18,
    color: '#172554',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 36,
  },
  description: {
    marginTop: 12,
    color: '#64748B',
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
    color: '#172554',
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
    color: '#1D4ED8',
    fontSize: 22,
    fontWeight: '900',
  },
  infoLabel: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 42,
    backgroundColor: '#E5E7EB',
  },
  guideCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
  },
  guideText: {
    marginBottom: 8,
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
