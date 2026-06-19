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
  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.number}>QUESTION {questionNumber}</Text>
        <Text style={styles.content}>{question.content}</Text>
      </View>

      <View style={styles.choices}>
        {question.choices.map((choice, index) => (
          <ChoiceOption
            key={choice.id}
            choice={choice}
            index={index}
            selected={selectedChoiceId === choice.id}
            onPress={() => onSelectChoice(choice.id)}
          />
        ))}
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
});
