import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CohortSelectScreen } from '../screens/CohortSelectScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MainScreen } from '../screens/MainScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { WorkbookDetailScreen } from '../screens/WorkbookDetailScreen';
import { WorkbookSolveScreen } from '../screens/WorkbookSolveScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#17183B',
          contentStyle: { backgroundColor: '#F5F6F8' },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
        <Stack.Screen
          name="CohortSelect"
          component={CohortSelectScreen}
          options={{ title: '기수 선택' }}
        />
        <Stack.Screen name="Main" component={MainScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="WorkbookDetail"
          component={WorkbookDetailScreen}
          options={{ title: '문제집 상세' }}
        />
        <Stack.Screen
          name="WorkbookSolve"
          component={WorkbookSolveScreen}
          options={{ title: '문제 풀이' }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ title: '채점 결과', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
