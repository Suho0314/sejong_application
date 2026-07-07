import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { brand } from '../theme/brand';
import sgneLogo from '../../assets/sgne-logo.png';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onProfilePress?: () => void;
};

export function AppHeader({ title, subtitle, onProfilePress }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandArea}>
        <Image source={{ uri: sgneLogo }} style={styles.logo} resizeMode="contain" />
        <View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.profileButton} onPress={onProfilePress}>
          <Text style={styles.profileText}>나</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: brand.colors.border,
    backgroundColor: brand.colors.surface,
  },
  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  logo: {
    width: 38,
    height: 38,
  },
  subtitle: {
    marginBottom: 4,
    color: brand.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: brand.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: brand.colors.primaryLight,
  },
  profileText: {
    color: brand.colors.primaryDark,
    fontWeight: '800',
  },
});
