import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { brand } from '../theme/brand';

type PrimaryButtonProps = PropsWithChildren<{
  onPress: () => void;
  variant?: 'primary' | 'light' | 'kakao';
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
        variant === 'kakao' && styles.kakaoButton,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.label,
          variant === 'light' && styles.lightLabel,
          variant === 'kakao' && styles.kakaoLabel,
        ]}
      >
        {children}
      </Text>
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
    backgroundColor: brand.colors.primary,
  },
  lightButton: {
    borderWidth: 1,
    borderColor: brand.colors.primary,
    backgroundColor: brand.colors.surface,
  },
  kakaoButton: {
    backgroundColor: brand.colors.kakao,
  },
  disabledButton: {
    opacity: 0.45,
  },
  label: {
    color: brand.colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  lightLabel: {
    color: brand.colors.primaryDark,
  },
  kakaoLabel: {
    color: brand.colors.kakaoText,
  },
});
