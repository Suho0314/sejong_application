import { StyleSheet, Text, View } from 'react-native';

import type { GradedAnswer } from '../types/student';

type WrongAnswerCardProps = {
  answer: GradedAnswer;
  index: number;
};

export function WrongAnswerCard({ answer, index }: WrongAnswerCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.number}>오답 {index + 1}</Text>
        <Text style={styles.badge}>틀림</Text>
      </View>

      <Text style={styles.question}>{answer.questionContent}</Text>

      <View style={[styles.answerBox, styles.selectedBox]}>
        <Text style={styles.answerLabel}>내가 선택한 답</Text>
        <Text style={styles.selectedText}>{answer.selectedChoiceText}</Text>
      </View>

      <View style={[styles.answerBox, styles.correctBox]}>
        <Text style={styles.answerLabel}>정답</Text>
        <Text style={styles.correctText}>{answer.correctChoiceText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  number: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    fontSize: 11,
    fontWeight: '900',
  },
  question: {
    marginTop: 14,
    color: '#172554',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
  },
  answerBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
  },
  selectedBox: {
    backgroundColor: '#FEF2F2',
  },
  correctBox: {
    backgroundColor: '#EFF6FF',
  },
  answerLabel: {
    marginBottom: 5,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  selectedText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
  },
  correctText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '800',
  },
});
