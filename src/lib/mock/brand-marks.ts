import type { ImageSourcePropType } from 'react-native';

/**
 * A house's own mark, bundled, keyed by brand id.
 *
 * Same arrangement as `card-art.ts` and for the same reason: `Brand.logoUrl` mirrors a backend
 * field and has to stay a string, while a bundled asset is not a URL. When the backend starts
 * serving marks, `brandMarkSource` finds them on the brand and never looks in here.
 *
 * These are **other companies' trademarks**, which is why they live as files rather than as SVG
 * components the way `src/components/brand-marks/` holds Google's and Apple's. Those two are ours
 * to draw because they are fixed parts of a sign-in screen; a card brand's mark is data, arrives
 * with the brand, and must never be redrawn by hand — a hand-traced monogram is a wrong logo, and
 * a wrong logo is worse than none.
 *
 * The card face tints whatever is here to white, so the file needs **transparency and a single
 * solid colour**. A JPEG, or a PNG on a white rectangle, will render as a white block.
 *
 * MCM's was supplied as white artwork on a black square; the black is the ground, not part of the
 * mark, so it was turned into transparency by reading the luminance as the alpha channel and then
 * cropped to the artwork's own bounds. The crop matters as much as the knockout: `contentFit`
 * fits whatever is in the file, so a mark floating in a square of padding would be fitted padding
 * and all, and drawn at a fraction of the size it was given.
 */
export const MOCK_BRAND_MARKS: Record<string, ImageSourcePropType> = {
  mcm: require('../../../assets/brand-marks/mcm.png'),
};
