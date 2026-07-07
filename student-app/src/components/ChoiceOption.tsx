import { Platform, Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';

import type { Choice } from '../types/student';
import { brand } from '../theme/brand';

const preserveLineBreaksStyle = Platform.OS === 'web' ? ({ whiteSpace: 'pre-wrap' } as TextStyle) : null;

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
      <Text style={[styles.text, preserveLineBreaksStyle, selected && styles.selectedText]}>{choice.text}</Text>
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
    borderColor: brand.colors.border,
    borderRadius: 16,
    backgroundColor: brand.colors.surface,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: brand.colors.primary,
    backgroundColor: brand.colors.primarySoft,
  },
  number: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: brand.colors.surfaceMuted,
  },
  selectedNumber: {
    backgroundColor: brand.colors.primary,
  },
  numberText: {
    color: brand.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedNumberText: {
    color: brand.colors.surface,
  },
  text: {
    flex: 1,
    color: brand.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  selectedText: {
    color: brand.colors.primaryDark,
  },
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 2,
    borderColor: brand.colors.border,
    borderRadius: 10,
  },
  selectedRadio: {
    borderColor: brand.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.colors.primary,
  },
});
