import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type PrimaryButtonProps = PropsWithChildren<{
  onPress: () => void;
  variant?: 'primary' | 'light';
  disabled?: boolean;
}>;

export function PrimaryButton({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        variant === 'light' && styles.lightButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, variant === 'light' && styles.lightLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#2563EB',
  },
  lightButton: {
    backgroundColor: '#EFF6FF',
  },
  disabledButton: {
    opacity: 0.45,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lightLabel: {
    color: '#2563EB',
  },
});
