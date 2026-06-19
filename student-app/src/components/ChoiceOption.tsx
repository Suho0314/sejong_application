import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Choice } from '../types/student';

type ChoiceOptionProps = {
  choice: Choice;
  index: number;
  selected: boolean;
  onPress: () => void;
};

export function ChoiceOption({ choice, index, selected, onPress }: ChoiceOptionProps) {
  return (
    <Pressable style={[styles.option, selected && styles.selectedOption]} onPress={onPress}>
      <View style={[styles.number, selected && styles.selectedNumber]}>
        <Text style={[styles.numberText, selected && styles.selectedNumberText]}>{index + 1}</Text>
      </View>
      <Text style={[styles.text, selected && styles.selectedText]}>{choice.text}</Text>
      <View style={[styles.radio, selected && styles.selectedRadio]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  number: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  selectedNumber: {
    backgroundColor: '#2563EB',
  },
  numberText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  selectedNumberText: {
    color: '#FFFFFF',
  },
  text: {
    flex: 1,
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  selectedText: {
    color: '#1E3A8A',
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  selectedRadio: {
    borderColor: '#2563EB',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
});
