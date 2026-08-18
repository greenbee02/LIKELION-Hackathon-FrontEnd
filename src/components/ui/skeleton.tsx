import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * A placeholder in the shape of the content that has not arrived yet.
 *
 * Radix Themes ships a Skeleton, but Themes is DOM-only and cannot run here, so this reproduces
 * its behaviour rather than importing it: a gray-3 block, pulsing, sized like the thing it stands
 * in for. Sizing is the caller's job — a skeleton that does not match its content's dimensions
 * makes the screen jump when the data lands, which is the one thing it exists to prevent.
 */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({ opacity: progress.value }));

  return <Animated.View style={[styles.base, style, pulse]} />;
}

/** A run of text lines. The last line is short, the way a real paragraph ends mid-width. */
export function SkeletonText({ lines = 1, lineHeight = 16 }: { lines?: number; lineHeight?: number }) {
  return (
    <>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          style={{
            height: lineHeight,
            borderRadius: radius.full,
            width: i === lines - 1 && lines > 1 ? '60%' : '100%',
            marginTop: i === 0 ? 0 : lineHeight * 0.5,
          }}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
  },
});
