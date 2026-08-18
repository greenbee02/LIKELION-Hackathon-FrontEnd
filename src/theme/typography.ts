import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Type, set in the platform's own font.
 *
 * This is a multi-brand platform, so the app's chrome may not carry any one house's voice. The
 * system font is the most neutral choice available and the only one that costs nothing to load:
 * SF Pro on iOS, Roboto on Android, the OS stack on web. A brand's own typeface, if it ever
 * arrives, travels with that brand's cards as data — it never sets the interface.
 *
 * Reach for a role, not a size. Sizes here are paired with the line height and weight they were
 * chosen against; splitting them apart at a call site is how a type system stops being one.
 */
const family = Platform.select({
  ios: undefined, // undefined = San Francisco
  android: undefined, // undefined = Roboto
  default: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});

const base = { fontFamily: family, color: colors.text } satisfies TextStyle;

export const type = {
  /** 32 — the issuance moment, and nothing else. One per screen at most. */
  display: { ...base, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
  /** 24 — a screen's title. */
  title: { ...base, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  /** 18 — a section heading, or a card's product name. */
  heading: { ...base, fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  /** 16 — running text. The default; if unsure, this one. */
  body: { ...base, fontSize: 16, lineHeight: 22, fontWeight: '400' },
  /** 14 — a button's label, a form field's label. Medium so it holds on a filled surface. */
  label: { ...base, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  /** 12 — metadata: purchase date, serial, store. Usually paired with `colors.textMuted`. */
  caption: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
