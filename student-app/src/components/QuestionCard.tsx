import { StyleSheet, Text, View } from 'react-native';

import type { Question } from '../types/student';
import { ChoiceOption } from './ChoiceOption';

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
        <Text style={styles.content}>{question.content ?? '문항 내용이 없습니다.'}</Text>
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
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    color: '#172554',
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
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
