import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * How far along something is, drawn rather than only counted.
 *
 * The number beside it says the same thing more precisely, so this is not carrying information —
 * it is carrying *distance*. "2 / 4장" is read; a bar that is half full is seen, and the gap
 * between where it stops and where it ends is the whole reason anyone buys a fourth card.
 *
 * Gray 9 on gray 3: the fill is a solid fill, which is what step 9 is for, and the track is a
 * control at rest. Neither is text, so neither may be a step above 8 — a bar drawn in step 12
 * would be the loudest thing on a screen whose subject is the reward above it.
 *
 * `radius.full` on a 6pt element, because at that height a corner is not softened, it is round.
 */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
    >
      {/* Percentage rather than flex, so an empty bar stays a track and a full one has no seam. */}
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.solid },
});
