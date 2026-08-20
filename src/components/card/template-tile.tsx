import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CARD_ASPECT } from './card-face';
import { Badge } from '@/components/ui/badge';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/lib/card-art';
import type { CardTemplate } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 하우스가 승인한 디자인 하나.
 *
 * 카드에 입힐 것이므로 카드와 같은 3:4 다. 여기서는 카드인 척해도 되고, 사실 그게 이 타일이
 * 하는 말이다 — "고르면 당신 카드가 이렇게 됩니다."
 *
 * **썸네일이 없으면 색으로 그린다.** `/images/templates/*.png` 는 인증 뒤에 있어서 자주
 * 비고, 그때 회색 상자를 놓으면 세 템플릿이 전부 같아 보여 고를 수가 없다. 다행히 응답의
 * `resourceData` 가 색을 데이터로 실어 오므로, 그 색이 곧 그 템플릿의 얼굴이 된다.
 *
 * 여기 hex 가 등장하는 것은 `brand-marks/` 규칙의 예외가 아니라 그 규칙 그대로다 — 하우스의
 * 색은 우리가 정하는 값이 아니라 카드와 함께 여행하는 데이터다.
 */
export function TemplateTile({
  template,
  selected,
  current,
  onPress,
}: {
  template: CardTemplate;
  selected: boolean;
  /** 지금 이 카드에 붙어 있는 디자인인가. */
  current?: boolean;
  onPress: () => void;
}) {
  const press = usePressScale();
  const art = imageSource(template.frontImageUrl);
  const primary = template.resource?.primaryColor;
  const accent = template.resource?.accentColor;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={template.name}
      onPress={onPress}
      {...press.handlers}
      style={({ pressed }) => [styles.tile, pressed && raiseWhilePressed]}
    >
      <Animated.View style={[styles.inner, press.style]}>
        <View style={styles.faceBox}>
          <View style={[styles.face, primary ? { backgroundColor: primary } : styles.faceFallback]}>
            {art ? (
              <Image source={art} style={styles.art} contentFit="cover" transition={200} />
            ) : accent ? (
              /* 그림이 없을 때의 얼굴. 강조색 띠 하나로 두 템플릿을 구별할 수 있게 한다. */
              <View style={[styles.band, { backgroundColor: accent }]} />
            ) : null}
          </View>

          {selected ? <View style={styles.ring} pointerEvents="none" /> : null}
          {selected ? (
            <View style={styles.check} pointerEvents="none">
              <Check size={14} color={colors.textInverted} strokeWidth={3} />
            </View>
          ) : null}
          {current && !selected ? (
            <View style={styles.badge}>
              <Badge label="현재" />
            </View>
          ) : null}
        </View>

        <Text variant="label" numberOfLines={2} style={styles.name}>
          {template.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const CHECK = 24;

const styles = StyleSheet.create({
  tile: { flex: 1, ...allowPressOverflow },
  inner: { ...allowPressOverflow },
  faceBox: { position: 'relative' },
  face: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  /** 색조차 없는 템플릿 — 이름만으로 고르게 된다. 드문 상태이지만 지원되는 상태다. */
  faceFallback: { backgroundColor: colors.surface },
  art: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  band: { height: '18%', width: '100%' },
  ring: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radius.base,
  },
  check: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    width: CHECK,
    height: CHECK,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.solidStrong,
  },
  badge: { position: 'absolute', top: space[2], left: space[2] },
  name: { marginTop: space[2] },
});
