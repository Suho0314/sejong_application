import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTab, SubmissionResult } from './student';

export type RootStackParamList = {
  Login: undefined;
  CohortSelect: undefined;
  Main: {
    cohortId: string;
    initialTab?: MainTab;
    tabRequestKey?: number;
  };
  WorkbookDetail: {
    workbookId: string;
  };
  WorkbookSolve: {
    workbookId: string;
  };
  Result: { result?: SubmissionResult } | undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
