import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScoreSummaryCard } from '../components/ScoreSummaryCard';
import type { Cohort, Student, WorkbookResult } from '../types/student';

type ProfileScreenProps = {
  student: Student;
  cohort: Cohort;
  results: WorkbookResult[];
};

export function ProfileScreen({ student, cohort, results }: ProfileScreenProps) {
  const solvedWorkbookCount = results.length;
  const totalCorrect = results.reduce((sum, result) => sum + result.correctCount, 0);
  const totalSolved = results.reduce((sum, result) => sum + result.solvedQuestionCount, 0);
  const correctRate = totalSolved === 0 ? 0 : Math.round((totalCorrect / totalSolved) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{student.name.slice(0, 1)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.loginId}>{student.loginId}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>소속 기수</Text>
        <Text style={styles.infoTitle}>{cohort.name}</Text>
        <Text style={styles.infoDescription}>{cohort.period}</Text>
      </View>

      <ScoreSummaryCard
        correctRate={correctRate}
        solvedWorkbookCount={solvedWorkbookCount}
        correctCount={totalCorrect}
      />
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
    gap: 14,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#DBEAFE',
  },
  avatarText: {
    color: '#1D4ED8',
    fontSize: 22,
    fontWeight: '900',
  },
  name: {
    color: '#172554',
    fontSize: 22,
    fontWeight: '900',
  },
  loginId: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  infoLabel: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  infoTitle: {
    marginTop: 8,
    color: '#172554',
    fontSize: 18,
    fontWeight: '900',
  },
  infoDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
});
