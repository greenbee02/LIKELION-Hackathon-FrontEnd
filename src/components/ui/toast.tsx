import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

const ToastContext = createContext<((message: string) => void) | null>(null);

/**
 * One line of text, bottom of the screen, gone in two seconds.
 *
 * It exists mostly for controls that are visibly present but not yet wired — the social sign-in
 * buttons. A button that looks live and does nothing at all reads as a bug during a demo; a
 * button that says why is a deliberate state.
 *
 * Deliberately not a queue: a second call replaces the first. Anything that needs to be read
 * twice does not belong in a toast.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      opacity.value = withTiming(1, { duration: 150 });
      timer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        timer.current = setTimeout(() => setMessage(null), 200);
      }, 2000);
    },
    [opacity],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <View pointerEvents="none" style={[styles.layer, { paddingBottom: insets.bottom + space[6] }]}>
          <Animated.View style={[styles.toast, fade]}>
            <Text variant="label" tone="inverted">
              {message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: space[4],
  },
  toast: {
    backgroundColor: colors.solidStrong,
    borderRadius: radius.full,
    paddingVertical: space[3],
    paddingHorizontal: space[5],
  },
});
