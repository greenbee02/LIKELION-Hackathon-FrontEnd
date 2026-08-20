import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardFace } from './card-face';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 내보낼 그림의 폭. 3배 화면에서 960px 이 되어 스토리에 올려도 뭉개지지 않고, 그 이상 키워봐야
 * 카드 얼굴의 원본 아트웍이 먼저 한계에 닿는다.
 */
export const SHARE_FRAME_WIDTH = 320;

/**
 * 앱을 떠나는 그림.
 *
 * **앞면만 나간다.** 이것은 단순화가 아니라 기능 그 자체다 — 뒷면에는 이 카드가 발급된 시리얼
 * 넘버와 구매한 매장이 적혀 있고, 그건 구매 기록이라 주인 말고 누구의 것도 아니다. 그래서
 * 공유는 화면에 보이는 `CardFlip` 을 찍지 않는다. 뒤집힌 상태에서 누르면 뒷면이 나가버리기
 * 때문이다. 대신 이 상자를 무대 밖에 따로 세워 두고 그것을 찍는다 — 무엇이 나가는지가 카드가
 * 어느 쪽을 보고 있느냐와 무관해진다.
 *
 * 이름과 도시가 얼굴 아래 붙는 것은 카드 밖으로 나가는 그림에만 해당한다. 앱 안에서는 얼굴이
 * 이미 무엇인지 말하고 그 아래를 비워두지만, 남의 타임라인에서는 이 그림에 앞뒤 문맥이 없다.
 */
export function ShareFrame({ card, ref }: { card: Card; ref?: Ref<View> }) {
  return (
    /* `collapsable={false}` — 안드로이드는 자기 그림이 없는 컨테이너 뷰를 레이아웃에서 걷어내
       버리고, 걷어내진 뷰에는 찍을 것이 없다. */
    <View ref={ref} collapsable={false} style={styles.frame}>
      <CardFace card={card} />
      <View style={styles.meta}>
        <Text variant="label" numberOfLines={2}>
          {card.product.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.city}>
          {card.store.city}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Gray 1 rather than transparent: a captured image carries whatever was behind it, and
     "whatever was behind it" on a screen with no explicit ground is undefined. */
  frame: {
    width: SHARE_FRAME_WIDTH,
    padding: space[4],
    borderRadius: radius.base,
    backgroundColor: colors.background,
  },
  meta: { marginTop: space[3] },
  city: { marginTop: space[1] },
});

/**
 * 무대 밖 — 레이아웃에는 있고 화면에는 없는 자리.
 *
 * 찍히려면 뷰가 실제로 그려져 있어야 하므로 `display: none` 도 `opacity: 0` 도 쓸 수 없다.
 * 가로로 화면 밖에 밀어두는 것이 세 플랫폼에서 모두 통하는 유일한 방법이고, 절대 위치라
 * 화면의 높이 계산에도 끼지 않는다 — 스크롤하지 않는 카드 상세에서 이건 그냥 편한 게 아니라
 * 필요조건이다.
 */
export const offstage = {
  position: 'absolute',
  top: 0,
  left: -SHARE_FRAME_WIDTH * 2,
} as const;
