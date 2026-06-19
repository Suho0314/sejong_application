import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import {
  mockCohorts,
  mockStudent,
  mockWorkbooks,
} from '../mock/studentMockData';
import { useSolveProgress } from '../state/SolveProgressContext';
import type { ScreenProps } from '../types/navigation';
import type { MainTab } from '../types/student';
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

  useEffect(() => {
    if (route.params.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params.initialTab, route.params.tabRequestKey]);

  const cohort = useMemo(
    () => mockCohorts.find((item) => item.id === route.params.cohortId) ?? mockCohorts[0],
    [route.params.cohortId],
  );

  const cohortWorkbooks = useMemo(
    () => mockWorkbooks
      .filter((workbook) => workbook.cohortId === cohort.id)
      .map((workbook) => {
        const progress = getProgress(workbook.id);

        return {
          ...workbook,
          status: resolveWorkbookStatus(workbook, progress),
          progressRate: calculateSolveProgressRate(workbook, progress),
        };
      }),
    [cohort.id, getProgress, progressList],
  );

  const renderContent = () => {
    if (activeTab === 'wrongAnswers') {
      return <WrongAnswerScreen cohortId={cohort.id} />;
    }

    if (activeTab === 'profile') {
      return <ProfileScreen student={mockStudent} cohort={cohort} />;
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
      {renderContent()}
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
});
