import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from './glass-surface';
import { Text } from './text';
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The height of the part that is always showing, derived rather than picked: 8 above the grabber,
 * the grabber's own 4, 8 under it, the 22 of an `action` line, and 12 below that. 54.
 *
 * The safe area is not in it. On a device with a home indicator the closed sheet is this plus the
 * inset, and the sheet works that out for itself — see the head's padding below.
 */
export const SHEET_PEEK = 54;

/**
 * How much room a screen must leave at the foot so its last element clears the closed sheet.
 *
 * The sheet floats over the page, so nothing reserves space for it — the screen underneath runs
 * full height and pays for the overlap itself, exactly as it does for the tab bar.
 */
export function useSheetSpace() {
  const insets = useSafeAreaInsets();
  return SHEET_PEEK + insets.bottom + space[4];
}

/**
 * A panel that rises from the foot of the screen when it is dragged, and rests there showing its
 * own name when it is not.
 *
 * Detail that belongs to a screen but is not what the screen is *about* has two bad homes: below
 * the fold, where it is found by scrolling past the subject, and behind a modal, which replaces
 * the subject to show something subordinate to it. A sheet is the third answer — the subject stays
 * where it is and the detail comes to meet it.
 *
 * **It is fused to the screen's edges, not floated inside them, and this is the one glass surface
 * that is.** The tab bar is an object laid on top of a page and has to show the page passing on
 * both sides of it to read that way. A sheet is not an object on the page; it is the bottom wall
 * of the screen coming up. The gesture starts at that edge, so the thing it moves has to own it —
 * a panel with air on three sides reads as a card that happens to be near the bottom, and the
 * motion stops meaning anything. Only the two corners facing the content are rounded, because the
 * two against the wall have no shape of their own.
 *
 * **It casts no shadow, and it is the only glass surface that does not.** A shadow is what a
 * surface drops into the gap between itself and the page, and this one has no gap — it is fused
 * to three walls. What separates it from the content is its single real top edge, which the glass
 * hairline already draws. A shadow there is not depth, it is a thick dark line along the one edge
 * the surface has.
 *
 * **Nothing is mounted when it opens.** The content is laid out from the first frame and the glass
 * clips it; opening only changes how much of it the clip lets through. That is what makes the
 * height animation possible at all — the panel has to know how tall its content is before it can
 * rise by exactly that much — and it means the sheet cannot pop, reflow, or arrive late.
 *
 * The height is animated rather than the position, because the sheet is anchored to the bottom:
 * growing downward in layout moves the header *up* on screen, which is the motion being asked for,
 * and it needs no clipping container of its own to hide the overflow.
 */
export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  /* 0 closed, 1 open. Both this and the measured height are shared values so the drag can read
     them on the UI thread — a gesture that had to hop to JS for the content's height would drop
     frames on the one interaction whose whole point is that it tracks the finger. */
  const open = useSharedValue(0);
  const body = useSharedValue(0);
  const start = useSharedValue(0);

  const gesture = useMemo(() => {
    const settle = (to: number) =>
      withTiming(to, { duration: motion.sheetDuration, easing: motion.easing });

    const pan = Gesture.Pan()
      .onStart(() => {
        start.value = open.value;
      })
      .onUpdate((e) => {
        if (body.value <= 0) return;
        /* Upward is negative, and the drag is measured as a fraction of the content's own height
           so the panel arrives under the finger wherever it was released. */
        const next = start.value - e.translationY / body.value;
        open.value = Math.min(1, Math.max(0, next));
      })
      .onEnd((e) => {
        /* A flick decides on its own, whatever distance it covered; a slow drag is decided by
           where it was let go. Without the velocity case a deliberate short flick would fall back
           to closed, which reads as the sheet refusing the gesture. */
        if (e.velocityY < -300) open.value = settle(1);
        else if (e.velocityY > 300) open.value = settle(0);
        else open.value = settle(open.value > 0.5 ? 1 : 0);
      });

    const tap = Gesture.Tap().onEnd(() => {
      open.value = settle(open.value > 0.5 ? 0 : 1);
    });

    /* Pan has priority: a tap only fires when the finger never travelled far enough to drag. */
    return Gesture.Exclusive(pan, tap);
  }, [open, body, start]);

  const height = useAnimatedStyle(() => ({
    height: SHEET_PEEK + (1 - open.value) * insets.bottom + open.value * body.value,
  }));

  /* The home indicator's clearance migrates as the panel opens. Closed, the title is the last
     thing above the edge and has to carry it; open, the content is, and the body's own bottom
     padding does. Anything else fails one of the two: a fixed inset on the head opens a gap under
     the title, and an inset only on the body is clipped away with the body while it is closed —
     the clip cuts from the bottom, so whatever sits last in the layout is cut first. */
  const head = useAnimatedStyle(() => ({
    paddingBottom: space[3] + (1 - open.value) * insets.bottom,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.sheet, height]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="위로 밀면 열리고 아래로 밀면 닫힙니다"
      >
        <GlassSurface borderRadius={radius.base} corners="top" shadow={false} style={styles.fill}>
          <Animated.View style={[styles.head, head]}>
            <View style={styles.grabber} />
            <Text variant="action">{title}</Text>
          </Animated.View>
          {/* Measured here, once, at its natural height — the panel rises by exactly this much. */}
          <View
            onLayout={(e) => (body.value = e.nativeEvent.layout.height)}
            style={[styles.body, { paddingBottom: space[4] + insets.bottom }]}
          >
            {children}
          </View>
        </GlassSurface>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  /** Against all three walls. The bottom edge is the sheet's own, not a margin it sits inside. */
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fill: { flex: 1 },
  head: { alignItems: 'center', paddingTop: space[2], gap: space[2] },
  /* Step 8 — the strongest border, and the weakest thing that is not text. On glass it has to
     hold against whatever scrolled underneath, which is what step 8 exists for. */
  grabber: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
  },
  body: { paddingHorizontal: space[4] },
});
