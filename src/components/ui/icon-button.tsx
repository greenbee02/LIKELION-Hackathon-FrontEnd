import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSurface } from './glass-surface';
import { allowPressOverflow, usePressScale } from './press-scale';
import { colors, scaleAlpha } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * 40, not the 52 the labelled controls share — a control with no words needs no room for them.
 *
 * `large` 는 조작이 아니라 **페이지의 일부로 읽혀야 하는 표시**를 위한 것이다. 40 짜리 진한
 * 아이콘은 어디에 놓아도 "누르는 것"으로 보이고, 그건 헤더에서는 맞지만 그림 옆에 서는
 * 화살표에서는 화면에 못으로 박힌 것처럼 보인다. 크고 옅으면 그림에 딸린 것이 된다.
 */
const SIZE = { base: 40, large: 56 } as const;
const GLYPH = { base: 22, large: 32 } as const;

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
  size?: keyof typeof SIZE;
  /**
   * `muted` 는 스케일의 9 — 일러스트의 윤곽선과 같은 값이다. 그래서 그림 옆에 서면 그림의
   * 일부로 읽힌다. **글자가 아니라 표시이므로 "글자는 11·12" 규칙에 걸리지 않는다.**
   *
   * 눌렀을 때 바닥이 깔리지 않는 것도 여기에 딸린 규칙이다. 옅은 표시 뒤에 불투명한 원이
   * 나타나면 그 순간 다시 버튼이 되고, 그러면 옅게 만든 이유가 없어진다 — 눌린 것은 커지는
   * 것으로만 말한다.
   */
  tone?: 'default' | 'muted';
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
  size = 'base',
  tone = 'default',
  accessibilityLabel,
}: IconButtonProps) {
  const press = usePressScale();
  const box = { width: SIZE[size], height: SIZE[size] };
  const ink = tone === 'muted' ? colors.solid : colors.text;
  const quiet = tone === 'muted';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...press.handlers}
      hitSlop={4}
      style={[box, allowPressOverflow]}
    >
      {({ pressed }) => (
        <Animated.View style={press.style}>
          {variant === 'glass' ? (
            <GlassSurface borderRadius={radius.full} style={box}>
              <Animated.View
                style={[styles.button, box, pressed && styles.pressedOnGlass]}
                pointerEvents="none"
              >
                <Icon size={GLYPH[size]} color={ink} strokeWidth={1.75} />
              </Animated.View>
            </GlassSurface>
          ) : (
            <Animated.View
              style={[styles.button, box, pressed && !quiet && styles.pressed]}
              pointerEvents="none"
            >
              <Icon size={GLYPH[size]} color={ink} strokeWidth={1.75} />
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  pressed: { backgroundColor: colors.surface },
  /** Over glass the press has to be translucent, or it punches an opaque hole in the material. */
  pressedOnGlass: { backgroundColor: scaleAlpha.grayA3 },
});
