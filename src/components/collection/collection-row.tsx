import { ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CARD_ASPECT, CardFace } from '@/components/card/card-face';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { assetUrl } from '@/lib/config';
import { imageSource } from '@/lib/card-art';
import { Text } from '@/components/ui/text';
import type { Card, UserCollection } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 표지 카드의 폭. 높이는 카드 비율이 정한다 — `heading` 한 줄과 `caption` 한 줄이 서는 높이다.
 *
 * **빈 자리도 같은 비율이어야 한다.** 여기 3:4 를 손으로 적어둔 탓에 카드가 든 폴더는 66,
 * 빈 폴더는 56 으로 그려져서 목록의 행 높이가 폴더마다 달랐다. `CARD_ASPECT` 하나만 보게
 * 하면 그 어긋남이 존재할 수 없다.
 */
const COVER = 42;

/**
 * 컬렉션 하나, 목록의 한 줄로.
 *
 * **표지는 저장된 커버 이미지가 우선이다.** 커버가 없던 기존 컬렉션은 담긴 첫 카드의 얼굴을
 * 폴백으로 사용해 이전 데이터도 빈 표지로 바뀌지 않는다.
 *
 * 빈 컬렉션은 표지가 없다. 그 자리를 3단계 사각형으로 두는 것은 "여기 카드가 없다"는 사실의
 * 그림이지 빠진 것이 아니다.
 */
export function CollectionRow({
  collection,
  cover,
  onPress,
}: {
  collection: UserCollection;
  /** 표지로 쓸 카드. 컬렉션이 비었거나 그 카드를 아직 못 찾았으면 `null`. */
  cover: Card | null;
  onPress: () => void;
}) {
  const press = usePressScale();
  const coverImage = imageSource(assetUrl(collection.coverImageUrl));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${collection.cardCount}장`}
      onPress={onPress}
      {...press.handlers}
      style={({ pressed }) => [styles.row, pressed && raiseWhilePressed]}
    >
      <Animated.View style={[styles.inner, press.style]}>
        <View style={styles.cover}>
          {coverImage ? (
            <Image source={coverImage} style={styles.coverImage} contentFit="cover" transition={200} />
          ) : cover ? (
            <CardFace card={cover} />
          ) : (
            <View style={styles.empty} />
          )}
        </View>

        <View style={styles.body}>
          <Text variant="heading" numberOfLines={1}>
            {collection.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {collection.cardCount > 0 ? `${collection.cardCount}장` : '아직 비어 있습니다'}
          </Text>
        </View>

        <ChevronRight size={20} color={colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { ...allowPressOverflow },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    ...allowPressOverflow,
  },
  /** 얼굴은 자기 모서리를 자르므로 폭만 정해주면 된다. */
  cover: { width: COVER },
  coverImage: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.small },
  empty: {
    width: COVER,
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: space[1] },
});
