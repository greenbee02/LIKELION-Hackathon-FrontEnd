import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { brandMarkSource, useCardArt } from '@/lib/card-art';
import { formatPurchaseDate } from '@/lib/format';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** Portrait, the proportion of a trading card rather than a credit card. */
export const CARD_ASPECT = 3 / 4;

/**
 * The card itself, with nothing around it.
 *
 * Two lines of type, both along the top: where and when it was bought on the left, which house
 * issued it on the right. Nothing else.
 *
 * The product's name is not on the card, and that is the point — the picture already shows what
 * was bought, so printing the name is describing a photograph to the person looking at it. The
 * name, the serial, the store and the care instructions belong to the detail view, where there is
 * room to read them. What the face has to do is be recognisable across a grid at a glance, and it
 * does that on the artwork alone.
 *
 * Two ways it can look. With artwork it is a photograph — the product standing in the city it was
 * bought in — and the brand's accent survives only as the ground behind it, which is what shows
 * while the image decodes. Without artwork the accent fills the face on its own, and that is a
 * finished state rather than a placeholder.
 *
 * The accent is the one colour in the app that comes from outside the token file, and the rule
 * holds because it is data travelling with the card rather than a decision the design system
 * made — onboarding a house changes this file's output without changing this file.
 */
export function CardFace({ card, art }: { card: Card; art?: ImageSourcePropType | null }) {
  const { brand, store, purchaseDate } = card;
  /* 훅이므로 넘겨받았든 아니든 항상 부른다. 고르는 것은 결과뿐이다. */
  const own = useCardArt(card);
  /* `undefined` 는 "네가 정해라", `null` 은 "그림 없이 그려라". 둘을 구분하지 않으면 편집
     화면이 액센트만 남은 얼굴을 보여줄 방법이 없다. */
  const source = art === undefined ? own : art;
  const mark = brandMarkSource(brand);

  return (
    <View style={[styles.face, { backgroundColor: brand.accent }]}>
      {source ? (
        <Image source={source} style={styles.art} contentFit="cover" transition={200} />
      ) : null}
      <Scrim />

      <View style={styles.top}>
        <View style={styles.place}>
          {/* The city, shouted. It is the one word on the card that says this was a trip. */}
          <Text variant="engraving" style={[styles.ink, styles.city]} numberOfLines={1}>
            {store.city.toUpperCase()}
          </Text>
          <Text variant="caption" style={[styles.ink, styles.faded]} numberOfLines={1}>
            {formatPurchaseDate(purchaseDate)}
          </Text>
        </View>
        {/* Each house signs its own card — the platform's name appears nowhere on this face. */}
        {mark ? (
          <Image
            source={mark}
            style={styles.mark}
            contentFit="contain"
            contentPosition="top right"
            /* Knocked out to white: the mark rides on a photograph, and a house's own colours
               would have to fight whatever the artwork put behind them. A signature is one
               colour. */
            tintColor={colors.textInverted}
            accessibilityLabel={brand.name}
          />
        ) : (
          <Text variant="action" style={[styles.ink, styles.brand]} numberOfLines={1}>
            {brand.name}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * The ground the type stands on.
 *
 * The top band only, because that is where the type is. The artwork is generated, so that band
 * could land on a night sky or on a sunlit stone wall, and white has to hold on either. A flat
 * wash over the whole face would have to be dark enough for the worst case, which would mute
 * every image to protect two lines of text; a gradient pays only where the text is and leaves the
 * rest of the photograph alone.
 *
 * Drawn in SVG because that is the only real gradient available without adding a dependency, and
 * a stack of translucent bands would band visibly against a smooth sky.
 */
function Scrim() {
  return (
    <Svg style={styles.art} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="cardFaceScrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.scrimInk} stopOpacity={0.6} />
          <Stop offset="0.22" stopColor={colors.scrimInk} stopOpacity={0.18} />
          <Stop offset="0.4" stopColor={colors.scrimInk} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardFaceScrim)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  face: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    overflow: 'hidden',
  },
  art: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: space[3],
    gap: space[2],
  },
  place: { flexShrink: 1 },
  /* Letterspacing lives in the `engraving` role, not here — it was chosen with the size and the
     face, and a call site overriding one of the three would be a different decision wearing the
     role's name. This is only the shadow that keeps the hairlines off a bright sky. */
  city: {
    textShadowColor: colors.scrimInk,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  /** The house's name sits on the type scale like everything else — no wordmark, no licence. */
  brand: { letterSpacing: 0.5 },
  /* A box the mark fits inside rather than a size it is set to. Height is the real constraint —
     every house's mark reads at the same optical weight when they share a cap height — while the
     width is loose enough for a wordmark to run wide. MCM's is nearly square and takes 20×18 of
     it; a long wordmark would take the full 48 and sit shorter.

     18 is the size the city is set at beside it, which is the point: the mark is a signature on
     the card, not a headline, and it should read at the weight of the type it shares the row
     with. Shrink one and the other follows. */
  mark: { width: 48, height: 18 },
  /** gray 1 — the face is a filled surface, so its type is inverted the way a solid button's is. */
  ink: { color: colors.textInverted },
  /** Held back by weight of ink rather than by a lighter colour, since there is no lighter one. */
  faded: { opacity: 0.75 },
});
