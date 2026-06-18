import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { WorkbookListScreen } from '../screens/WorkbookListScreen';
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
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
        <Stack.Screen name="WorkbookList" component={WorkbookListScreen} options={{ title: '문제집' }} />
        <Stack.Screen name="WorkbookSolve" component={WorkbookSolveScreen} options={{ title: '문제 풀이' }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '결과 확인' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
