import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT, CardFace } from '@/components/card/card-face';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The card as the issuance screen shows it: one face, centred, with the caption it carries in the
 * grid.
 *
 * It is `CardFace` itself rather than a stand-in — the card the customer is watching arrive has
 * to be the same object they will find in their collection a second later, and a screen that
 * showed its own version of it would be showing them something they never get. The caption comes
 * from `CardTile` for the same reason: the face deliberately omits the product's name, and the
 * one moment that name matters most is the moment the card is issued.
 *
 * Narrower than the grid's tile. A single card on an otherwise empty screen at full width reads
 * as a poster; held to 220 it stays an object on a table.
 *
 * **캡션은 가운데로 맞춘다** — 격자에서는 타일이 열을 이루므로 왼쪽 정렬이 축이지만, 발급
 * 화면에서 카드는 한 장뿐이고 그 아래의 제목·설명·버튼이 전부 화면 가운데를 축으로 선다.
 * 캡션만 왼쪽에 붙으면 축이 둘이 되고, 그것이 배치가 흐트러져 보이는 이유다.
 */
export function IssueCard({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <View style={styles.holder}>
        <Skeleton style={styles.face} />
        <View style={styles.meta}>
          <Skeleton style={styles.line} />
          <Skeleton style={[styles.line, styles.lineShort]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.holder}>
      <CardFace card={card} />
      <View style={styles.meta}>
        <Text variant="label" numberOfLines={2} style={styles.centered}>
          {card.product.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.store}>
          {card.store.name}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* QR 발급 중에도 생성된 리소스가 충분히 크게 보이도록 폭을 넓힌다.
     높이는 `face` 의 CARD_ASPECT 가 함께 계산하므로 이미지가 늘어나거나 찌그러지지 않는다. */
  holder: { width: '100%', maxWidth: 270, alignSelf: 'center' },
  face: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  meta: { marginTop: space[2] },
  centered: { textAlign: 'center' },
  line: { height: 20, borderRadius: radius.small },
  lineShort: { width: '60%', marginTop: space[1], alignSelf: 'center' },
  store: { marginTop: space[1], textAlign: 'center' },
});
