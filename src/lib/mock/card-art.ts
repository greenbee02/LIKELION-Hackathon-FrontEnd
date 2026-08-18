import type { ImageSourcePropType } from 'react-native';

/**
 * Card artwork, bundled, keyed by card id.
 *
 * These are the first two images generated from `dev/active/card-art-prompt.md` — the product
 * standing in the city it was bought in, with that city's landmark behind it. They are here to
 * make the grid real before the backend can generate anything; once `GET /cards/{id}/ai-resources`
 * returns a URL, `cardArtSource` finds it on the card and never looks in this file.
 *
 * `require` rather than a URL string, because a bundled asset is not a URL: `Product.imageUrl`
 * mirrors the backend DTO and has to stay a string, so the local ones live beside it instead of
 * inside it. That is also why this map is keyed by card and not folded into `MOCK_CARDS`.
 *
 * Every mock card has one. The artless path — a brand's accent filling the face on its own — is
 * still live in `CardFace`, but nothing in the mock exercises it any more; the card that used to
 * is gone. Worth remembering before assuming that path still works.
 */
export const MOCK_CARD_ART: Record<string, ImageSourcePropType> = {
  /** Visetos trolley on a terrace above Seoul, N Seoul Tower lit behind it. */
  c1: require('../../../assets/card-art/mcm-trolley-namsan.jpg'),
  /** Pink drawstring bag on a river wall, Lotte World Tower across the Han. */
  c2: require('../../../assets/card-art/mcm-drawstring-lotte.jpg'),
  /** Cardigan on a railing at the Louvre, the pyramid behind it. */
  c3: require('../../../assets/card-art/mcm-cardigan-louvre.jpg'),
  /** Blazer on a balcony rail over the Seine, the Eiffel Tower across the water. */
  c4: require('../../../assets/card-art/mcm-blazer-eiffel.jpg'),
};
