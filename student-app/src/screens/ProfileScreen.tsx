import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScoreSummaryCard } from '../components/ScoreSummaryCard';
import type { Cohort, Student, SubmissionRecord } from '../types/student';
import { calculateStudentPerformance } from '../utils/studentPerformance';

type ProfileScreenProps = {
  student: Student;
  cohort: Cohort;
  submissions: SubmissionRecord[];
};

export function ProfileScreen({ student, cohort, submissions }: ProfileScreenProps) {
  const summary = calculateStudentPerformance(submissions, cohort.id);

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
        correctRate={summary.correctRate}
        solvedWorkbookCount={summary.solvedWorkbookCount}
        correctCount={summary.correctCount}
      />
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
    backgroundColor: '#E7F6EC',
  },
  avatarText: {
    color: '#087437',
    fontSize: 22,
    fontWeight: '900',
  },
  name: {
    color: '#1A1F1B',
    fontSize: 22,
    fontWeight: '900',
  },
  loginId: {
    marginTop: 4,
    color: '#66706A',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  infoLabel: {
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
  },
  infoTitle: {
    marginTop: 8,
    color: '#1A1F1B',
    fontSize: 18,
    fontWeight: '900',
  },
  infoDescription: {
    marginTop: 6,
    color: '#66706A',
    fontSize: 13,
  },
});
