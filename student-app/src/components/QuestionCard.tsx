import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';

import type { Question } from '../types/student';
import { ChoiceOption } from './ChoiceOption';

const preserveLineBreaksStyle = Platform.OS === 'web' ? ({ whiteSpace: 'pre-wrap' } as TextStyle) : null;

type QuestionCardProps = {
  question: Question;
  questionNumber: number;
  selectedChoiceId?: string;
  onSelectChoice: (choiceId: string) => void;
};

export function QuestionCard({
  question,
  questionNumber,
  selectedChoiceId,
  onSelectChoice,
}: QuestionCardProps) {
  const choices = Array.isArray(question.choices) ? question.choices : [];

  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.number}>QUESTION {questionNumber}</Text>
        <Text style={[styles.content, preserveLineBreaksStyle]}>{question.content ?? '문항 내용이 없습니다.'}</Text>
      </View>

      <View style={styles.choices}>
        {choices.length === 0 ? (
          <Text style={styles.emptyChoices}>선택지가 없습니다.</Text>
        ) : (
          choices.map((choice, index) => (
            <ChoiceOption
              key={choice.id}
              choice={choice}
              index={index}
              selected={selectedChoiceId === choice.id}
              onPress={() => onSelectChoice(choice.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  questionCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  number: {
    marginBottom: 12,
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    color: '#1A1F1B',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 31,
  },
  choices: {
    gap: 12,
  },
  emptyChoices: {
    padding: 18,
    borderRadius: 16,
    color: '#66706A',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
