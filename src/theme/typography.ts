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
   * The wordmark, and nothing else — the letters "CURIO" on the sign-in screen and wherever the
   * product signs its own name later.
   *
   * This is the one role not set in the platform font, and the exception holds because a wordmark
   * is a logo rather than typography: Jost belongs to Curio, the platform, and Curio is not one of
   * the houses whose cards it carries. The moment this face sets a heading or a button the rule
   * above is broken, so it does not.
   *
   * **Geometric, and light, and set in caps.** The mark is a circle-and-line drawing — `C` and `O`
   * are struck from the same circle, `R` carries a straight leg — which is what makes it read as
   * something stamped rather than typed. A humanist sans (Titillium, which set this role before)
   * squares off the `O` and the drawing collapses into a word. The weight is 300 for the same
   * reason: at 40pt the letters are large enough that a regular weight reads as emphasis, and a
   * mark is not emphatic, it is simply present.
   *
   * 40 is off the scale on purpose — a logo is measured, not typeset. The tracking is 0.34em,
   * which is far past anything running text would tolerate and is the point: **caps set tight are
   * a word, caps set open are a mark.** `fontWeight` is absent because the family name already
   * names the weight; setting both makes Android pick the wrong face.
   *
   * Tracking is applied *after* the last letter too, so a centred line sits half a track to the
   * left of where it looks like it should — `Wordmark` corrects that once, and nothing else should
   * reach for this role directly.
   */
  wordmark: { ...base, fontFamily: 'Jost_300Light', fontSize: 40, lineHeight: 48, letterSpacing: 40 * 0.34 },

  /**
   * The city stamped on a card's face, and nothing else.
   *
   * The second exception to the platform font, and it holds for a narrower reason than the
   * wordmark's: this is not interface type at all. It is an engraving on an object — the way a
   * year is struck on a coin — and the object is a collectible whose whole appeal is that it
   * looks made rather than rendered. A system sans set in caps over a photograph reads as a
   * caption laid on top of it; a Garamond set in caps reads as part of the card.
   *
   * It sets no label, no button and no heading anywhere in the app, so the rule that a brand's
   * typeface never sets the interface is untouched — and this face is not a brand's, it is the
   * platform's own choice for the surface every house's cards share.
   *
   * SemiBold rather than something lighter, because a Garamond's hairlines are its whole
   * character and they vanish first: at 22pt over a bright Paris sky, Light would be a rumour.
   * 18 is `heading`'s size, and it lands smaller than `heading` looks — Cormorant's cap height
   * runs short for its point size. That is the right trade here: an engraving is struck small.
   * It is the card's quietest claim, not its headline, and the artwork under it is the subject.
   *
   * The line height is the point size, with none of the leading every other role carries. Those
   * roles are set for running text, where the space between lines is what makes a paragraph
   * readable; this one only ever sets a single line of caps with something small directly under
   * it, and leading there is just a gap holding the two apart. Caps have no descenders to clip,
   * which is what makes it safe here and nowhere else.
   */
  engraving: {
    ...base,
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 18,
    lineHeight: 18,
    /* Barely open. Caps set dead tight collide at the diagonals — the E after an S needs somewhere
       to go — but this is a stamp, not a luxury advertisement, and wide-tracked caps are that
       advertisement's most worn-out gesture. Half a point is enough to keep the letters apart
       without making the word look spaced out. */
    letterSpacing: 0.5,
  },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
