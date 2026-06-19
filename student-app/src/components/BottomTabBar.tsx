import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MainTab } from '../types/student';

type TabItem = {
  id: MainTab;
  label: string;
  icon: string;
};

const tabs: TabItem[] = [
  { id: 'workbooks', label: '문제집', icon: '▤' },
  { id: 'wrongAnswers', label: '오답정리', icon: '✓' },
  { id: 'profile', label: '내 정보', icon: '●' },
];

type BottomTabBarProps = {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
};

export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <Pressable key={tab.id} style={styles.item} onPress={() => onChange(tab.id)}>
            <Text style={[styles.icon, active && styles.activeText]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.activeText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 74,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    color: '#9CA3AF',
    fontSize: 22,
    fontWeight: '800',
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeText: {
    color: '#1D4ED8',
  },
});
