import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CardFace } from './card-face';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 그리드에서 고를 수 있는 카드 한 장.
 *
 * `CardTile` 을 고쳐 쓰지 않는다. 그쪽은 **누르면 그 카드의 상세로 간다**가 계약이고, 여기서
 * 누르는 것은 담을지 말지를 뒤집는 일이다. 같은 그림에 두 가지 뜻을 주면 어느 화면에서
 * 무엇이 일어나는지 컴포넌트가 알아야 하고, 그때부터 프롭이 갈라진다.
 *
 * **고른 것을 테두리로 표시한다.** 팔레트에 강조색이 없으므로 선택은 색이 아니라 형태로
 * 말해야 하고, 그래서 얼굴 위에 8단계 테두리가 둘리고 오른쪽 위에 체크가 앉는다. 고르지
 * 않은 카드는 흐려지지 않는다 — 흐림은 "쓸 수 없다"는 뜻이고, 여기서는 전부 고를 수 있다.
 */
export function CardSelectTile({
  card,
  selected,
  onToggle,
}: {
  card: Card;
  selected: boolean;
  onToggle: () => void;
}) {
  const press = usePressScale();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={card.product.name}
      onPress={onToggle}
      {...press.handlers}
      style={({ pressed }) => [styles.tile, pressed && raiseWhilePressed]}
    >
      <Animated.View style={[styles.inner, press.style]}>
        <View style={styles.faceBox}>
          <CardFace card={card} />
          {/* 테두리는 얼굴 위에 겹쳐 그린다. 얼굴 자체에 테두리를 주면 3:4 안쪽으로 파고들어
              그림이 잘린다. */}
          {selected ? <View style={styles.ring} pointerEvents="none" /> : null}
          {selected ? (
            <View style={styles.check} pointerEvents="none">
              <Check size={14} color={colors.textInverted} strokeWidth={3} />
            </View>
          ) : null}
        </View>
        <Text variant="label" numberOfLines={2} style={styles.name}>
          {card.product.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const CHECK = 24;

const styles = StyleSheet.create({
  tile: { flex: 1, ...allowPressOverflow },
  inner: { ...allowPressOverflow },
  /** 얼굴은 자기 모서리를 자르므로 이 상자는 자르지 않는다 — 체크가 모서리 밖으로 걸친다. */
  faceBox: { position: 'relative' },
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
  name: { marginTop: space[2] },
});
