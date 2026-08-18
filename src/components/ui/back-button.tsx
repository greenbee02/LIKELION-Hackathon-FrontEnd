import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * A way back, for screens that run outside a header.
 *
 * `back()` rather than a fixed route: these screens are reachable from more than one place, and a
 * back button that always lands somewhere specific is a navigation bug waiting for the second
 * entry point. `fallback` covers a cold start straight into a deep link, where there is no history.
 */
export function BackButton({ fallback = '/sign-in' }: { fallback?: '/sign-in' | '/' }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="뒤로"
      hitSlop={space[2]}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <ChevronLeft size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    marginLeft: -space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  pressed: { backgroundColor: colors.surface },
});
