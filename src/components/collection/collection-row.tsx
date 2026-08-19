import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CardFace } from '@/components/card/card-face';
import { allowPressOverflow, raiseWhilePressed, usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import type { Card, UserCollection } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 표지 카드의 폭. 3:4 이므로 높이는 56 — `heading` 한 줄과 `caption` 한 줄이 딱 그만큼이다. */
const COVER = 42;

/**
 * 컬렉션 하나, 목록의 한 줄로.
 *
 * **표지는 담긴 첫 카드의 얼굴이다.** 컬렉션에는 자기 그림이 없고(`coverImageUrl` 은 서버가
 * 받기는 하지만 올릴 방법이 없다), 폴더 아이콘을 그리면 열두 개가 전부 같은 모양이 된다.
 * 안에 든 것이 곧 표지라는 것은 사진첩이 원래 하는 일이다.
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
          {cover ? <CardFace card={cover} /> : <View style={styles.empty} />}
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
  empty: {
    width: COVER,
    aspectRatio: 3 / 4,
    borderRadius: radius.small,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: space[1] },
});
