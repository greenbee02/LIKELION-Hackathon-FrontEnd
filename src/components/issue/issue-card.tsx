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
        <Text variant="label" numberOfLines={2}>
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
  holder: { width: '100%', maxWidth: 185, alignSelf: 'center' },
  face: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  meta: { marginTop: space[2] },
  line: { height: 20, borderRadius: radius.small },
  lineShort: { width: '60%', marginTop: space[1] },
  store: { marginTop: space[1] },
});
