import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../state/AuthContext';
import { useSolveProgress } from '../state/SolveProgressContext';
import { useStudentData } from '../state/StudentDataContext';
import type { ScreenProps } from '../types/navigation';
import type { Cohort, MainTab } from '../types/student';
import { calculateSolveProgressRate } from '../utils/solveProgress';
import { resolveWorkbookStatus } from '../utils/workbookStatus';
import { ProfileScreen } from './ProfileScreen';
import { WorkbookListScreen } from './WorkbookListScreen';
import { WrongAnswerScreen } from './WrongAnswerScreen';

const tabTitle: Record<MainTab, string> = {
  workbooks: '문제은행',
  wrongAnswers: '오답정리',
  profile: '내 정보',
};

export function MainScreen({ navigation, route }: ScreenProps<'Main'>) {
  const [activeTab, setActiveTab] = useState<MainTab>(route.params.initialTab ?? 'workbooks');
  const { getProgress, progressList } = useSolveProgress();
  const { isAuthenticated, user } = useAuth();
  const { cohorts, errorMessage, isLoading, refresh, submissions, workbooks } = useStudentData();

  useEffect(() => {
    if (route.params.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params.initialTab, route.params.tabRequestKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigation.replace('Login');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cohort = useMemo(
    () =>
      cohorts.find((item) => item.id === route.params.cohortId) ??
      ({
        id: route.params.cohortId,
        name: '내 기수',
        courseName: '배포 문제집',
        period: '배포된 문제집을 확인하세요.',
      } satisfies Cohort),
    [cohorts, route.params.cohortId],
  );

  const cohortWorkbooks = useMemo(
    () => workbooks
      .filter((workbook) => workbook.cohortId === cohort.id)
      .map((workbook) => {
        const progress = getProgress(workbook.id);

        return {
          ...workbook,
          status: resolveWorkbookStatus(workbook, progress),
          progressRate: calculateSolveProgressRate(workbook, progress),
        };
      }),
    [cohort.id, getProgress, progressList, workbooks],
  );

  const renderContent = () => {
    if (isLoading && workbooks.length === 0) {
      return (
        <View style={styles.centerCard}>
          <Text style={styles.centerTitle}>배포된 문제집을 불러오는 중입니다.</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerCard}>
          <Text style={styles.centerTitle}>데이터를 불러오지 못했습니다.</Text>
          <Text style={styles.centerDescription}>{errorMessage}</Text>
          <PrimaryButton onPress={refresh}>다시 불러오기</PrimaryButton>
        </View>
      );
    }

    if (activeTab === 'wrongAnswers') {
      return (
        <WrongAnswerScreen
          cohortId={cohort.id}
          submissions={submissions}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <ProfileScreen
          student={{
            id: user?.studentId ?? '',
            name: user?.name ?? '학생',
            loginId: user?.loginId ?? '',
            cohortId: cohort.id,
          }}
          cohort={cohort}
          submissions={submissions}
        />
      );
    }

    return (
      <WorkbookListScreen
        cohort={cohort}
        workbooks={cohortWorkbooks}
        onWorkbookPress={(workbookId) => navigation.navigate('WorkbookDetail', { workbookId })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={tabTitle[activeTab]}
        subtitle={cohort.courseName}
        onProfilePress={() => setActiveTab('profile')}
      />
      <View style={styles.contentArea}>{renderContent()}</View>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3FBF5',
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  centerCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F3FBF5',
  },
  centerTitle: {
    color: '#1A1F1B',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  centerDescription: {
    color: '#66706A',
    fontSize: 13,
    textAlign: 'center',
  },
});
