import { Tabs } from 'expo-router';
import { Gift, Layers, ScanLine, User } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { type as typeRoles } from '@/theme/typography';

/**
 * Four tabs, in the order the experience loop runs: what you have, how you get more, what it
 * earns you, who you are. Scan sits in the middle because it is the only one a customer opens the
 * app specifically to do.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: typeRoles.caption,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '컬렉션', tabBarIcon: ({ color }) => <Layers size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: '스캔', tabBarIcon: ({ color }) => <ScanLine size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ title: '리워드', tabBarIcon: ({ color }) => <Gift size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '마이', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
});
