import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  WorkbookList: undefined;
  WorkbookSolve: {
    workbookId?: string;
  };
  Result: {
    workbookId?: string;
    score?: number;
  };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
