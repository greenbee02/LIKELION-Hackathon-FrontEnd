import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSurface } from './glass-surface';
import { allowPressOverflow, usePressScale } from './press-scale';
import { colors, scaleAlpha } from '@/theme/colors';
import { radius } from '@/theme/radius';

/** 40, not the 52 the labelled controls share — a control with no words needs no room for them. */
const SIZE = 40;

type IconButtonProps = {
  /** A lucide icon component, passed as a type so size and colour are decided here. */
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress?: () => void;
  /**
   * `plain` is bare — for a header row where the page's own white is the ground. `glass` gives it
   * a box to sit on, the same material as the tab bar, for when it has to hold its own against
   * content rather than against a margin.
   */
  variant?: 'plain' | 'glass';
  /** Required: with no label on screen, this is the only name the control has. */
  accessibilityLabel: string;
};

/**
 * An action that fits in a header row, where a 52pt labelled `Button` would outweigh the title
 * beside it.
 *
 * Both variants are `radius.full`. An icon has no corners of its own to echo, so a rounded square
 * around one is a shape the content never asked for; a circle is the only outline that says
 * nothing beyond "this is pressable". It is also what the radius rule already says a pill or an
 * icon-only button gets.
 *
 * The scale sits outside the glass rather than inside it: growing the icon within a fixed box
 * would push it against the clip, so the whole box grows instead.
 *
 * The `Pressable` carries the control's size explicitly. Without it a flex parent stretches the
 * touch target across its whole cross axis — a bare arrow in a header ends up owning the entire
 * header row — and, worse, the growing `Animated.View` inherits that width and scales about the
 * middle of it, throwing the 40pt box a sixth of the row's width to the left while held. A
 * control that moves off screen under the finger is the same bug as a control you cannot aim at,
 * and both are this one line.
 */
export function IconButton({
  icon: Icon,
  onPress,
  variant = 'plain',
  accessibilityLabel,
}: IconButtonProps) {
  const press = usePressScale();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...press.handlers}
      hitSlop={4}
      style={[styles.control, allowPressOverflow]}
    >
      {({ pressed }) => (
        <Animated.View style={press.style}>
          {variant === 'glass' ? (
            <GlassSurface borderRadius={radius.full} style={styles.box}>
              <Animated.View
                style={[styles.button, pressed && styles.pressedOnGlass]}
                pointerEvents="none"
              >
                <Icon size={22} color={colors.text} strokeWidth={1.75} />
              </Animated.View>
            </GlassSurface>
          ) : (
            <Animated.View style={[styles.button, pressed && styles.pressed]} pointerEvents="none">
              <Icon size={22} color={colors.text} strokeWidth={1.75} />
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  pressed: { backgroundColor: colors.surface },
  /** Over glass the press has to be translucent, or it punches an opaque hole in the material. */
  pressedOnGlass: { backgroundColor: scaleAlpha.grayA3 },
  box: { width: SIZE, height: SIZE },
  /** The touch target is the control, never the space around it. */
  control: { width: SIZE, height: SIZE },
});
