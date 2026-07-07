import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { useAuth } from '../state/AuthContext';
import { useStudentData } from '../state/StudentDataContext';
import type { ScreenProps } from '../types/navigation';

export function CohortSelectScreen({ navigation }: ScreenProps<'CohortSelect'>) {
  const { isAuthenticated, user } = useAuth();
  const { cohorts, errorMessage, isLoading, refresh } = useStudentData();
  const displayCohorts = cohorts.length > 0
    ? cohorts
    : user?.cohortId
      ? [{
          id: user.cohortId,
          name: '내 기수',
          courseName: '배포 문제집',
          period: '배포된 문제집을 불러오세요.',
        }]
      : [];

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.kicker}>기수 선택</Text>
        <Text style={styles.title}>수강 중인 기수를 선택하세요</Text>
        <Text style={styles.description}>{user?.name ?? '학생'}님에게 배포된 문제집을 확인합니다.</Text>

        <Pressable style={styles.refreshButton} onPress={refresh}>
          <Text style={styles.refreshText}>{isLoading ? '불러오는 중...' : '배포 목록 새로고침'}</Text>
        </Pressable>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.list}>
          {displayCohorts.map((cohort) => {
            const selected = cohort.id === user?.cohortId;

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
    backgroundColor: '#F3FBF5',
  },
  kicker: {
    marginTop: 16,
    marginBottom: 8,
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: '#1A1F1B',
    fontSize: 27,
    fontWeight: '900',
  },
  description: {
    marginTop: 8,
    color: '#66706A',
    fontSize: 14,
  },
  list: {
    marginTop: 26,
    gap: 14,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#E7F6EC',
  },
  refreshText: {
    color: '#087437',
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 10,
    color: '#D14343',
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCE6DF',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    borderColor: '#A9DDB9',
    backgroundColor: '#F3FBF5',
  },
  course: {
    marginBottom: 8,
    color: '#0B9444',
    fontSize: 13,
    fontWeight: '900',
  },
  selectedText: {
    color: '#087437',
  },
  name: {
    color: '#1A1F1B',
    fontSize: 18,
    fontWeight: '900',
  },
  period: {
    marginTop: 6,
    color: '#66706A',
    fontSize: 13,
  },
  arrow: {
    color: '#DCE6DF',
    fontSize: 34,
    fontWeight: '300',
  },
});
