import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { mockCohorts, mockStudent } from '../mock/studentMockData';
import type { ScreenProps } from '../types/navigation';

export function CohortSelectScreen({ navigation }: ScreenProps<'CohortSelect'>) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.kicker}>기수 선택</Text>
        <Text style={styles.title}>수강 중인 기수를 선택하세요</Text>
        <Text style={styles.description}>{mockStudent.name}님에게 배포된 문제집을 확인합니다.</Text>

        <View style={styles.list}>
          {mockCohorts.map((cohort) => {
            const selected = cohort.id === mockStudent.cohortId;

            return (
              <Pressable
                key={cohort.id}
                style={[styles.card, selected && styles.selectedCard]}
                onPress={() => navigation.replace('Main', { cohortId: cohort.id })}
              >
                <View>
                  <Text style={[styles.course, selected && styles.selectedText]}>{cohort.courseName}</Text>
                  <Text style={styles.name}>{cohort.name}</Text>
                  <Text style={styles.period}>{cohort.period}</Text>
                </View>
                <Text style={[styles.arrow, selected && styles.selectedText]}>›</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  kicker: {
    marginTop: 16,
    marginBottom: 8,
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: '#172554',
    fontSize: 27,
    fontWeight: '900',
  },
  description: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  list: {
    marginTop: 26,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  course: {
    marginBottom: 8,
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  selectedText: {
    color: '#1D4ED8',
  },
  name: {
    color: '#172554',
    fontSize: 18,
    fontWeight: '900',
  },
  period: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
  arrow: {
    color: '#CBD5E1',
    fontSize: 34,
    fontWeight: '300',
  },
});
