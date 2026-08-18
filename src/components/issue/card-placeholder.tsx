import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import type { Card } from '@/lib/types';

/**
 * ⚠️ PLACEHOLDER — the real card object is `CardFace` / `CardTile`, being built in
 * `src/components/card/` by another session and not yet on this branch.
 *
 * This mirrors that component's structure deliberately rather than inventing its own: the same
 * 3:4 face, the city and date along the top left, the house's name opposite, and the product name
 * and store as a caption underneath rather than printed over the artwork. When `CardFace` lands,
 * this file is deleted and the three call sites in `src/app/issue/[token].tsx` swap to it with no
 * layout change — which is the whole reason to match it now instead of styling something else.
 *
 * What it cannot borrow yet, because those live on the other branch: the `engraving` type role
 * (Cormorant, for the city), the `scrimInk` token, the generated card artwork, and the brand mark
 * images. So the face here is the brand's accent on its own — which their `CardFace` treats as a
 * finished state, not a fallback: it is what shows while a photograph decodes.
 */

type Props = {
  card: Card | null;
  /** `skeleton` before the card exists, `generating` while its artwork is still being made. */
  state: 'skeleton' | 'generating' | 'ready';
};

export function CardPlaceholder({ card, state }: Props) {
  if (state === 'skeleton' || !card) {
    return (
      <View style={styles.tile}>
        <Skeleton style={styles.face} />
        <View style={styles.meta}>
          <Skeleton style={styles.metaLine} />
          <Skeleton style={styles.metaLineShort} />
        </View>
      </View>
    );
  }

  const dressed = state === 'ready';

  return (
    <View style={styles.tile}>
      {/* The accent is the one colour that reaches a component from outside the token file, and
          the rule holds because it is data travelling with the card — `Brand.accent`, not a
          decision this file made. */}
      <View style={[styles.face, { backgroundColor: card.brand.accent }]}>
        {/* Nothing is struck on the face until the artwork it belongs to exists. The card arriving
            bare and then being engraved is the moment the wait is spent on. */}
        {dressed ? (
          <View style={styles.top}>
            <View style={styles.place}>
              <Text variant="heading" style={[styles.ink, styles.city]} numberOfLines={1}>
                {card.store.city.toUpperCase()}
              </Text>
              <Text variant="caption" style={[styles.ink, styles.faded]} numberOfLines={1}>
                {formatPurchaseDate(card.purchaseDate)}
              </Text>
            </View>
            <Text variant="action" style={[styles.ink, styles.brand]} numberOfLines={1}>
              {card.brand.name}
            </Text>
          </View>
        ) : null}
      </View>

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

/**
 * `2026.07.14`. Local on purpose — the other branch has a `src/lib/format.ts` with this function
 * in it, and creating that path here would collide with it on merge for the sake of one line.
 */
function formatPurchaseDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** Portrait, the proportion of a trading card rather than a credit card — as `CardFace` uses. */
const CARD_ASPECT = 3 / 4;

const styles = StyleSheet.create({
  /** Wider than a grid tile: this is the one screen where the card is the subject, not an entry. */
  tile: { width: '100%', maxWidth: 280, alignSelf: 'center' },
  face: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: space[3],
    gap: space[2],
  },
  place: { flexShrink: 1 },
  /** The shadow that keeps white type off a light accent — the same job `CardFace`'s scrim does. */
  city: {
    textShadowColor: colors.text,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  brand: { letterSpacing: 0.5 },
  /** gray 1 — the face is a filled surface, so its type is inverted like a solid button's. */
  ink: { color: colors.textInverted },
  /** Held back by weight of ink rather than a lighter colour, since there is no lighter one. */
  faded: { opacity: 0.75 },
  meta: { marginTop: space[2] },
  store: { marginTop: space[1] },
  metaLine: { height: 20, width: '80%' },
  metaLineShort: { height: 16, width: '50%', marginTop: space[1] },
});
