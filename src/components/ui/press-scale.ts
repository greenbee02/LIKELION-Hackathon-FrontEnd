import { useCallback } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/motion';

/**
 * The press gesture every control in the app shares.
 *
 * A hook rather than a wrapper component, because the thing that scales is not always the thing
 * that receives the touch: a glass icon button scales its whole glass box, a card scales the card
 * and its caption together, a tab scales only the fill under its label. A wrapper would have to
 * guess which, and would get the layout wrong for two of the three. This way each component keeps
 * its own structure and only borrows the movement.
 *
 * Usage is always the same three lines — spread `handlers` onto the `Pressable`, put `style` on
 * the `Animated.View` that should grow:
 *
 *   const press = usePressScale();
 *   <Pressable {...press.handlers}>
 *     <Animated.View style={[styles.box, press.style]}>…</Animated.View>
 *   </Pressable>
 *
 * `disabled` freezes it rather than removing it, so a control that cannot be used does not answer
 * to a finger — which is the clearest way to say so without changing how it looks.
 */
export function usePressScale(disabled = false) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withTiming(motion.pressScale, {
      duration: motion.pressInDuration,
      easing: motion.easing,
    });
  }, [disabled, scale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: motion.pressOutDuration, easing: motion.easing });
  }, [scale]);

  return { style, handlers: { onPressIn, onPressOut } };
}

/**
 * What every container of a growing control has to say.
 *
 * React Native Web gives `View` `overflow: hidden` by default, where native gives it `visible`.
 * So a control that grows past its own bounds is fine on a phone and clipped on the web export —
 * by its own `Pressable`, then by the row, then by the screen's content container, each of which
 * silently trims a few more pixels. Nothing about it looks like a bug in the styles; the button
 * simply loses a corner.
 *
 * Applied to the containers a pressable grows inside, not globally: there are surfaces that must
 * keep clipping — glass clips its blur to a rounded shape, and a card clips its artwork to one —
 * and turning overflow off everywhere would break both.
 */
export const allowPressOverflow = { overflow: 'visible' } as const;

/**
 * Applied while held, to whatever is doing the growing.
 *
 * Siblings paint in source order, so a card in the left column grows *underneath* the one to its
 * right — the pressed thing ends up behind the thing that was not pressed. One step of stacking
 * fixes it, and it is set from the `pressed` flag rather than animated: stacking order has no
 * in-between value to tween through.
 */
export const raiseWhilePressed = { zIndex: 1 } as const;
