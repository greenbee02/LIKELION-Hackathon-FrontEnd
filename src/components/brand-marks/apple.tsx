import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/colors';

/**
 * Apple's mark, monochrome. Their guidelines allow black or white only, so this one does take a
 * token — step 12 on a light button, `#FFFFFF` from `./palettes` on the black one.
 *
 * As with `GoogleMark`, the viewBox is the glyph's measured bounding box rather than the 24×24
 * square it ships in, so `size` means the same rendered height for both marks. The apple stays
 * the narrower of the two because the shape is narrower — that is the mark, not a mismatch.
 */
const VIEW_BOX = '2.23 0.55 17.68 21.69';
const ASPECT = 17.68 / 21.69;

export function AppleMark({ size = 22, color = colors.text }: { size?: number; color?: string }) {
  return (
    <Svg width={size * ASPECT} height={size} viewBox={VIEW_BOX}>
      <Path
        fill={color}
        d="M17.05 12.04c-.03-2.75 2.25-4.07 2.35-4.13-1.28-1.87-3.27-2.13-3.98-2.16-1.7-.17-3.31 1-4.17 1-.86 0-2.19-.98-3.6-.95-1.85.03-3.56 1.08-4.51 2.73-1.92 3.33-.49 8.26 1.38 10.96.91 1.32 2 2.8 3.43 2.75 1.38-.06 1.9-.89 3.56-.89 1.66 0 2.13.89 3.58.86 1.48-.03 2.42-1.35 3.32-2.68 1.05-1.54 1.48-3.03 1.5-3.11-.03-.01-2.87-1.1-2.9-4.38M14.6 4.02c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.42.73-3.2 1.65-.7.81-1.31 2.11-1.15 3.36 1.22.09 2.46-.62 3.22-1.54"
      />
    </Svg>
  );
}
