import type { ImageSourcePropType } from 'react-native';

import { MOCK_BRAND_MARKS } from './mock/brand-marks';
import { MOCK_CARD_ART } from './mock/card-art';
import type { Brand, Card } from './types';

/**
 * Where a card's artwork comes from, resolved in one place.
 *
 * The backend wins when it has something: `product.imageUrl` is a real URL and becomes a `uri`
 * source. Only when it has nothing does the bundled mock stand in. That order is what lets a card
 * move from mock to live without the face being rewritten — when the AI pipeline starts returning
 * images, this function stops falling through and nothing above it notices.
 *
 * `null` is a real answer, not a failure: a card with no artwork shows the brand's own colour,
 * which is a finished state rather than a gap.
 */
export function cardArtSource(card: Card): ImageSourcePropType | null {
  if (card.product.imageUrl) return { uri: card.product.imageUrl };
  return MOCK_CARD_ART[card.id] ?? null;
}

/**
 * The house's mark, resolved the same way and in the same order: the backend first, the bundled
 * mock only when it has nothing.
 *
 * `null` is a supported answer — a brand with no mark signs its cards with its name set in type,
 * which is what every brand did before any mark existed.
 */
export function brandMarkSource(brand: Brand): ImageSourcePropType | null {
  if (brand.logoUrl) return { uri: brand.logoUrl };
  return MOCK_BRAND_MARKS[brand.id] ?? null;
}
