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

      <View style={styles.choiceList}>
        {answer.choices.map((choice, choiceIndex) => {
          const selected = choice.id === answer.selectedChoiceId;
          const correct = choice.id === answer.correctChoiceId;

          return (
            <View
              key={choice.id}
              style={[
                styles.choice,
                selected && styles.selectedChoice,
                correct && styles.correctChoice,
              ]}
            >
              <View
                style={[
                  styles.choiceNumber,
                  selected && styles.selectedChoiceNumber,
                  correct && styles.correctChoiceNumber,
                ]}
              >
                <Text
                  style={[
                    styles.choiceNumberText,
                    (selected || correct) && styles.highlightedNumberText,
                  ]}
                >
                  {choiceIndex + 1}
                </Text>
              </View>

              <Text style={styles.choiceText}>{choice.text}</Text>

              <View style={styles.choiceBadges}>
                {selected ? <Text style={styles.selectedBadge}>내 선택</Text> : null}
                {correct ? <Text style={styles.correctBadge}>정답</Text> : null}
              </View>
            </View>
          );
        })}
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
  choiceList: {
    marginTop: 12,
    gap: 9,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  selectedChoice: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  correctChoice: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  choiceNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  selectedChoiceNumber: {
    backgroundColor: '#DC2626',
  },
  correctChoiceNumber: {
    backgroundColor: '#2563EB',
  },
  choiceNumberText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  highlightedNumberText: {
    color: '#FFFFFF',
  },
  choiceText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  choiceBadges: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 8,
  },
  selectedBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    fontSize: 10,
    fontWeight: '900',
  },
  correctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    fontSize: 10,
    fontWeight: '900',
  },
});
