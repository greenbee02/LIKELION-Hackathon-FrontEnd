import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Badge } from '@/components/ui/badge';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { useProtectedUrl } from '@/lib/card-art';
import type { RecommendedProduct } from '@/lib/recommendations';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 아직 카드가 아닌 것.
 *
 * **`CardFace` 를 쓰지 않는 것이 이 파일의 요점이다.** 카드 얼굴에는 도시와 구매일이 새겨지는데
 * 아직 사지 않은 물건에는 둘 다 없다. 빈 채로 그리면 얼굴이 성립하지 않고, 액센트만 남긴
 * 얼굴은 이미 "사진이 아직 안 온 보유 카드"라는 다른 뜻을 갖고 있다. 같은 그림이 두 가지를
 * 뜻하기 시작하면 이 앱에서 카드가 무엇인지가 흐려진다 — **카드는 사고 난 뒤에 생기는
 * 것**이고, 그 사실이 제품의 전부다.
 *
 * 그래서 비율도 3:4 가 아니라 1:1 이다. 카드인 척하지 않는 가장 단순한 방법이다.
 *
 * 사진이 없으면 이름을 타이포로 세운다. `CardFace` 가 마크 없는 하우스에 하는 것과 같은
 * 처리이고, 결함이 아니라 지원되는 상태다.
 */
export function ProductTile({
  product,
  note,
  onPress,
}: {
  product: RecommendedProduct;
  /** 왜 여기 있는지 한 줄 — `Seoul Exclusive · 2장 남음`. */
  note?: string;
  onPress?: () => void;
}) {
  const press = usePressScale(!onPress);
  const art = useProtectedUrl(product.imageUrl);

  const body = (
    <Animated.View style={[styles.inner, press.style]}>
      <View style={styles.frame}>
        {art ? (
          <Image source={art} style={styles.art} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.blank}>
            <Text variant="caption" tone="muted" numberOfLines={3} style={styles.blankName}>
              {product.name}
            </Text>
          </View>
        )}
        {product.limited ? (
          <View style={styles.badge}>
            <Badge label="한정판" />
          </View>
        ) : null}
      </View>

      <Text variant="label" numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      {note ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </Animated.View>
  );

  if (!onPress) return <View style={styles.tile}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      {...press.handlers}
      style={({ pressed }) => [styles.tile, pressed && raiseWhilePressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, ...allowPressOverflow },
  inner: { gap: space[2], ...allowPressOverflow },
  /** 정사각형, 그리고 자기 모서리를 자른다 — 사진이 모서리 밖으로 새지 않아야 한다. */
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  art: { width: '100%', height: '100%' },
  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[3] },
  blankName: { textAlign: 'center' },
  badge: { position: 'absolute', top: space[2], left: space[2] },
  name: { marginTop: space[1] },
});
