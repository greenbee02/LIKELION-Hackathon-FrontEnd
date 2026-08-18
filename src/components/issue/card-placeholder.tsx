import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import type { Card } from '@/lib/types';

/**
 * ⚠️ PLACEHOLDER — the card object itself is being built in `src/components/card/`.
 *
 * The issuance screen needs something card-shaped on the day it is written, and guessing at the
 * real component would mean two of them. So this holds the position and nothing more: the right
 * proportion, the right corner, and the data a customer reads while they wait. When `<Card>`
 * lands, this file is deleted and the three call sites in `src/app/issue/[token].tsx` swap over.
 *
 * Deliberately not in `src/components/ui/`: it is not a primitive, it is a stand-in.
 */

type Props = {
  card: Card | null;
  /** `skeleton` before the card exists, `generating` while the artwork is being made. */
  state: 'skeleton' | 'generating' | 'ready';
};

export function CardPlaceholder({ card, state }: Props) {
  if (state === 'skeleton' || !card) {
    return (
      <View style={styles.frame}>
        <Skeleton style={styles.fill} />
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.artwork}>
        {state === 'generating' ? <Skeleton style={styles.fill} /> : null}
      </View>

      <View style={styles.caption}>
        <Text variant="caption" tone="muted">
          {card.brand.name}
        </Text>
        <Text variant="heading" numberOfLines={2} style={styles.name}>
          {card.product.name}
        </Text>
        <Text variant="caption" tone="muted" style={styles.serial}>
          {card.serialNumber}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 3 / 4,
    alignSelf: 'center',
    borderRadius: radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: { flex: 1, borderRadius: 0 },
  artwork: { flex: 1, backgroundColor: colors.surface },
  caption: { padding: space[3] },
  name: { marginTop: space[1] },
  serial: { marginTop: space[1] },
});
