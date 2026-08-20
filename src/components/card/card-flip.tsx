import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CardBack } from './card-back';
import { CARD_ASPECT, CardFace } from './card-face';
import { allowPressOverflow, usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { motion } from '@/theme/motion';
import { space } from '@/theme/spacing';
import { type } from '@/theme/typography';

/**
 * 카드 아래에 붙는 힌트 한 줄이 세로로 차지하는 높이.
 *
 * 높이가 정해진 자리에 카드를 맞춰 넣는 화면 — 스크롤하지 않는 카드 상세 — 은 카드에 줄 수 있는
 * 높이를 알아야 폭을 계산할 수 있고, 그 높이에서 이만큼을 먼저 뺀다. 상수를 여기서 내보내는 것은
 * 12 와 16 이 아래 스타일에서 오는 값이라 부르는 쪽이 다시 적으면 두 곳이 따로 움직이기 때문이다.
 */
export const CARD_FLIP_HINT = space[3] + type.caption.lineHeight;

/**
 * The card as an object you can turn over.
 *
 * Both sides live in the same box, one in flow and one laid over it, and the box rotates about
 * its vertical axis. Nothing is mounted or unmounted on the way — a flip that swapped one
 * component for another at the halfway point would be a cut dressed as a rotation, and the whole
 * reason the detail lives on the back is that reaching it should feel like handling the thing
 * rather than opening a page about it.
 *
 * Two guards keep exactly one side visible. `backfaceVisibility` is the real mechanism, and the
 * opacity flip at the midpoint is the belt to its braces: the value changes while the card is
 * edge-on and zero pixels wide, so the switch has nothing to show. Native and web disagree often
 * enough about backfaces that carrying both costs less than finding out which one this build is.
 *
 * It also grows under the finger, like every other pressable — one gesture, defined once. The two
 * motions compose rather than compete: the scale answers the touch, the turn answers the release.
 */
export function CardFlip({ card }: { card: Card }) {
  /* 0 is the face, 1 is the back. The shared value drives the rotation and React state drives the
     one line of text under it, because a worklet cannot set a caption and a caption cannot be
     interpolated. */
  const turn = useSharedValue(0);
  const [showBack, setShowBack] = useState(false);
  const press = usePressScale();

  /* 애니메이션은 갱신 함수 **밖**에서 시작한다. `setState` 의 갱신 함수는 순수해야 하고,
     React 는 개발 모드에서 그것을 두 번 부른다 — 안에 두면 카드가 한 번의 탭에 두 번
     돌기 시작한다. */
  const flip = useCallback(() => {
    const next = !showBack;
    setShowBack(next);
    turn.value = withTiming(next ? 1 : 0, {
      duration: motion.flipDuration,
      easing: motion.flipEasing,
    });
  }, [showBack, turn]);

  const front = useAnimatedStyle(() => ({
    transform: [
      { perspective: motion.flipPerspective },
      { rotateY: `${turn.value * 180}deg` },
    ],
    opacity: turn.value < 0.5 ? 1 : 0,
  }));

  const back = useAnimatedStyle(() => ({
    transform: [
      { perspective: motion.flipPerspective },
      { rotateY: `${turn.value * 180 + 180}deg` },
    ],
    opacity: turn.value < 0.5 ? 0 : 1,
  }));

  return (
    <View style={styles.holder}>
      <Pressable
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel={showBack ? '카드 앞면 보기' : '카드 뒷면 보기'}
        {...press.handlers}
        style={styles.press}
      >
        <Animated.View style={[styles.stage, press.style]}>
          <Animated.View style={[styles.side, front]}>
            <CardFace card={card} />
          </Animated.View>
          <Animated.View style={[styles.side, styles.overlay, back]}>
            <CardBack card={card} />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* The card gives no sign that it turns, and a demo is watched by people who will not try.
          One line, the quietest type in the system, saying the only thing there is to do here. */}
      <Text variant="caption" tone="muted" style={styles.hint}>
        {showBack ? '탭해서 앞면 보기' : '탭해서 뒤집기'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { width: '100%', ...allowPressOverflow },
  press: allowPressOverflow,
  stage: { width: '100%', aspectRatio: CARD_ASPECT },
  side: { width: '100%', height: '100%', backfaceVisibility: 'hidden' },
  overlay: { position: 'absolute', top: 0, left: 0 },
  hint: { marginTop: space[3], textAlign: 'center' },
});
