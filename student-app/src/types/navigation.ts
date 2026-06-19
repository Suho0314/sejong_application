import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  CohortSelect: undefined;
  Main: {
    cohortId: string;
  };
  WorkbookDetail: {
    workbookId: string;
  };
  WorkbookSolve: {
    workbookId: string;
  };
  SubmissionResult: {
    workbookId: string;
    answeredCount: number;
  };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
