import { Tabs } from 'expo-router';
import { Gift, Layers, ScanLine, User } from 'lucide-react-native';

import { TabBar } from '@/components/navigation/tab-bar';

/**
 * Four tabs, in the order the experience loop runs: what you have, how you get more, what it
 * earns you, who you are. Scan sits in the middle because it is the only one a customer opens the
 * app specifically to do.
 *
 * The bar itself is ours — see `TabBar`. It floats over the content as glass, so the navigator's
 * own bar is switched off entirely rather than restyled: `tabBarStyle` cannot express a surface
 * that the page scrolls underneath.
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
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
        options={{ title: 'My', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
