import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import {
  mockCohorts,
  mockResults,
  mockStudent,
  mockWorkbooks,
} from '../mock/studentMockData';
import type { ScreenProps } from '../types/navigation';
import type { MainTab } from '../types/student';
import { ProfileScreen } from './ProfileScreen';
import { WorkbookListScreen } from './WorkbookListScreen';
import { WrongAnswerScreen } from './WrongAnswerScreen';

const tabTitle: Record<MainTab, string> = {
  workbooks: '문제은행',
  wrongAnswers: '오답정리',
  profile: '내 정보',
};

export function MainScreen({ route }: ScreenProps<'Main'>) {
  const [activeTab, setActiveTab] = useState<MainTab>('workbooks');

  const cohort = useMemo(
    () => mockCohorts.find((item) => item.id === route.params.cohortId) ?? mockCohorts[0],
    [route.params.cohortId],
  );

  const cohortWorkbooks = useMemo(
    () => mockWorkbooks.filter((workbook) => workbook.cohortId === cohort.id),
    [cohort.id],
  );

  const cohortResults = useMemo(
    () =>
      mockResults.filter((result) =>
        cohortWorkbooks.some((workbook) => workbook.id === result.workbookId),
      ),
    [cohortWorkbooks],
  );

  const renderContent = () => {
    if (activeTab === 'wrongAnswers') {
      return <WrongAnswerScreen results={cohortResults} workbooks={cohortWorkbooks} />;
    }

    if (activeTab === 'profile') {
      return <ProfileScreen student={mockStudent} cohort={cohort} results={cohortResults} />;
    }

    return <WorkbookListScreen cohort={cohort} workbooks={cohortWorkbooks} />;
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
