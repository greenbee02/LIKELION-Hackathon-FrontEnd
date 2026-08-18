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
  /**
   * 16 — the label of a control the customer is meant to press: buttons, and the links that stand
   * in for them. Semibold and a step above `label`, because a control's own name is the thing
   * being read on a screen that exists to be acted on, not annotated.
   */
  action: { ...base, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  /** 14 — a form field's label, a tab, a tag. Medium so it holds on a filled surface. */
  label: { ...base, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  /** 12 — metadata: purchase date, serial, store. Usually paired with `colors.textMuted`. */
  caption: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '400' },

  /**
   * The wordmark, and nothing else — the letters "Curio" on the sign-in screen and wherever the
   * product signs its own name later.
   *
   * This is the one role not set in the platform font, and the exception holds because a wordmark
   * is a logo rather than typography: Titillium Web belongs to Curio, the platform, and Curio is
   * not one of the houses whose cards it carries. The moment this face sets a heading or a button
   * the rule above is broken, so it does not.
   *
   * 40 is off the scale on purpose — a logo is measured, not typeset. `fontWeight` is absent
   * because the family name already names the weight; setting both makes Android pick the wrong
   * face.
   */
  wordmark: { ...base, fontFamily: 'TitilliumWeb_700Bold', fontSize: 40, lineHeight: 48, letterSpacing: -0.5 },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
