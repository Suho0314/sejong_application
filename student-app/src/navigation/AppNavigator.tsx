import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CohortSelectScreen } from '../screens/CohortSelectScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ApprovalStatusScreen } from '../screens/ApprovalStatusScreen';
import { MainScreen } from '../screens/MainScreen';
import { NameOnboardingScreen } from '../screens/NameOnboardingScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { WorkbookDetailScreen } from '../screens/WorkbookDetailScreen';
import { WorkbookSolveScreen } from '../screens/WorkbookSolveScreen';
import { AuthProvider } from '../state/AuthContext';
import { SolveProgressProvider } from '../state/SolveProgressContext';
import { SubmissionHistoryProvider } from '../state/SubmissionHistoryContext';
import { StudentDataProvider } from '../state/StudentDataContext';
import type { RootStackParamList } from '../types/navigation';
import { brand } from '../theme/brand';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <AuthProvider>
      <StudentDataProvider>
        <SubmissionHistoryProvider>
          <SolveProgressProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Login"
                screenOptions={({ navigation }) => ({
                  headerTitleAlign: 'center',
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: brand.colors.surface },
                  headerTintColor: brand.colors.textPrimary,
                  contentStyle: { backgroundColor: brand.colors.primarySoft },
                  headerLeft: ({ canGoBack }) => (
                    canGoBack ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="이전 화면으로 이동"
                        hitSlop={12}
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                      >
                        <Text style={styles.backButtonText}>이전</Text>
                      </Pressable>
                    ) : null
                  ),
                })}
              >
                <Stack.Screen name="Login" component={LoginScreen} options={{ title: '로그인' }} />
                <Stack.Screen
                  name="ApprovalStatus"
                  component={ApprovalStatusScreen}
                  options={{ title: '가입 승인 상태', headerBackVisible: false }}
                />
                <Stack.Screen
                  name="NameOnboarding"
                  component={NameOnboardingScreen}
                  options={{ title: '이름 입력', headerBackVisible: false }}
                />
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
          </SolveProgressProvider>
        </SubmissionHistoryProvider>
      </StudentDataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  backButtonText: {
    color: brand.colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
});
