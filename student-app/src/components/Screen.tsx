import type { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { brand } from '../theme/brand';

export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.container}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.colors.primarySoft,
  },
});
