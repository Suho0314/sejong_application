import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onProfilePress?: () => void;
};

export function AppHeader({ title, subtitle, onProfilePress }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
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
    backgroundColor: '#FFFFFF',
  },
  subtitle: {
    marginBottom: 4,
    color: '#8B95A1',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#172554',
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
    backgroundColor: '#DBEAFE',
  },
  profileText: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
});
