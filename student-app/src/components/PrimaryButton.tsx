import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = PropsWithChildren<{
  onPress: () => void;
}>;

export function PrimaryButton({ children, onPress }: PrimaryButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#17183B',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
