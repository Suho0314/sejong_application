import { Platform, StyleSheet, Text, TextStyle, View } from 'react-native';

import type { GradedAnswer } from '../types/student';

const preserveLineBreaksStyle = Platform.OS === 'web' ? ({ whiteSpace: 'pre-wrap' } as TextStyle) : null;

type WrongAnswerCardProps = {
  answer: GradedAnswer;
};

export function WrongAnswerCard({ answer }: WrongAnswerCardProps) {
  const isCorrect = answer.isCorrect;
  const questionNumberLabel =
    typeof answer.sequence === 'number' && Number.isFinite(answer.sequence)
      ? `${answer.sequence}번`
      : '문항 번호 없음';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.number}>{questionNumberLabel}</Text>
        <Text style={[styles.badge, isCorrect ? styles.correctResultBadge : styles.wrongResultBadge]}>
          {isCorrect ? '정답' : '틀림'}
        </Text>
      </View>

      <Text style={[styles.question, preserveLineBreaksStyle]}>{answer.questionContent}</Text>

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

              <Text style={[styles.choiceText, preserveLineBreaksStyle]}>{choice.text}</Text>

              <View style={styles.choiceBadges}>
                {selected ? (
                  <Text style={[styles.selectedBadge, isCorrect && styles.correctSelectedBadge]}>
                    내 답
                  </Text>
                ) : null}
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
    color: '#0B9444',
    fontSize: 12,
    fontWeight: '900',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '900',
  },
  wrongResultBadge: {
    color: '#D14343',
    backgroundColor: '#FDECEC',
  },
  correctResultBadge: {
    color: '#087437',
    backgroundColor: '#E7F6EC',
  },
  question: {
    marginTop: 14,
    color: '#1A1F1B',
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
    borderColor: '#DCE6DF',
    borderRadius: 14,
    backgroundColor: '#F7F9F7',
  },
  selectedChoice: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FDECEC',
  },
  correctChoice: {
    borderColor: '#A9DDB9',
    backgroundColor: '#F3FBF5',
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
    backgroundColor: '#D14343',
  },
  correctChoiceNumber: {
    backgroundColor: '#0B9444',
  },
  choiceNumberText: {
    color: '#66706A',
    fontSize: 12,
    fontWeight: '800',
  },
  highlightedNumberText: {
    color: '#FFFFFF',
  },
  choiceText: {
    flex: 1,
    color: '#1A1F1B',
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
    color: '#D14343',
    backgroundColor: '#FDECEC',
    fontSize: 10,
    fontWeight: '900',
  },
  correctSelectedBadge: {
    color: '#087437',
    backgroundColor: '#E7F6EC',
  },
  correctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    overflow: 'hidden',
    borderRadius: 999,
    color: '#087437',
    backgroundColor: '#E7F6EC',
    fontSize: 10,
    fontWeight: '900',
  },
});
