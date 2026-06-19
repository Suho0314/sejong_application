import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { ResultSummaryCard } from '../components/ResultSummaryCard';
import { WrongAnswerCard } from '../components/WrongAnswerCard';
import type { ScreenProps } from '../types/navigation';

export function ResultScreen({ navigation, route }: ScreenProps<'Result'>) {
  const { result } = route.params;
  const wrongAnswers = result.gradedAnswers.filter((answer) => !answer.isCorrect);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.kicker}>RESULT</Text>
          <Text style={styles.title}>{result.score}점</Text>
          <Text style={styles.workbookTitle}>{result.workbookTitle}</Text>
        </View>

        <ResultSummaryCard
          totalQuestions={result.totalQuestions}
          correctCount={result.correctCount}
          wrongCount={result.wrongCount}
          correctRate={result.correctRate}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>오답 확인</Text>
          <Text style={styles.sectionCount}>{wrongAnswers.length}문항</Text>
        </View>

        {wrongAnswers.length === 0 ? (
          <View style={styles.perfectCard}>
            <Text style={styles.perfectTitle}>모든 문제를 맞혔어요!</Text>
            <Text style={styles.perfectDescription}>틀린 문제가 없어 오답 목록이 비어 있습니다.</Text>
          </View>
        ) : (
          <View style={styles.wrongList}>
            {wrongAnswers.map((answer, index) => (
              <WrongAnswerCard key={answer.questionId} answer={answer} index={index} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonItem}>
          <PrimaryButton
            variant="light"
            onPress={() =>
              navigation.navigate('Main', {
                cohortId: result.cohortId,
                initialTab: 'wrongAnswers',
              })
            }
          >
            오답정리
          </PrimaryButton>
        </View>
        <View style={styles.buttonItem}>
          <PrimaryButton
            onPress={() =>
              navigation.navigate('Main', {
                cohortId: result.cohortId,
                initialTab: 'workbooks',
              })
            }
          >
            문제집 목록
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
  },
  icon: {
    color: '#1D4ED8',
    fontSize: 30,
    fontWeight: '900',
  },
  kicker: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 5,
    color: '#172554',
    fontSize: 48,
    fontWeight: '900',
  },
  workbookTitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#172554',
    fontSize: 19,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '900',
  },
  wrongList: {
    gap: 12,
  },
  perfectCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  perfectTitle: {
    color: '#1D4ED8',
    fontSize: 17,
    fontWeight: '900',
  },
  perfectDescription: {
    marginTop: 7,
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  buttonItem: {
    flex: 1,
  },
});
