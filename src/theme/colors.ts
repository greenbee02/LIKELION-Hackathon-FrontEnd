import { gray, grayA } from '@radix-ui/colors';

/**
 * Colour comes from Radix Colors' 12-step gray scale. Each step has one job, and the step number
 * — not the shade — is what carries the meaning:
 *
 *   1–2   backgrounds
 *   3–5   interactive component fills (rest / hover / active)
 *   6–8   borders and separators (subtle / default / strong)
 *   9–10  solid fills
 *   11–12 accessible text (low contrast / high contrast)
 *
 * Reach for the role below, never the raw step, so a component says what it means. `scale` is
 * exported for the rare case that needs a step no role covers yet — add a role here instead of
 * reaching into it twice.
 *
 * Light only: there is no dark mode, so `grayDark` is deliberately not imported.
 */

/** Raw scale, for when a role does not exist yet. Prefer `colors`. */
export const scale = gray;

/** Translucent gray, for edges and scrims that sit over unknown content (photos, glass). */
export const scaleAlpha = grayA;

export const colors = {
  /** 1 — the app background. */
  background: gray.gray1,
  /** 2 — a panel that should read as slightly inset from the page. */
  backgroundSubtle: gray.gray2,

  /** 3 — a control at rest. */
  surface: gray.gray3,
  /** 4 — the same control under the finger or cursor. */
  surfaceHover: gray.gray4,
  /** 5 — pressed, or selected. */
  surfaceActive: gray.gray5,

  /** 6 — a separator that should barely register. */
  borderSubtle: gray.gray6,
  /** 7 — the default border, and focus rings. */
  border: gray.gray7,
  /** 8 — a border that needs to hold its own against a filled surface. */
  borderStrong: gray.gray8,

  /** 9 — a solid fill. Mid-gray: it is a fill, not a text colour. */
  solid: gray.gray9,
  /** 10 — the same fill, hovered. */
  solidHover: gray.gray10,

  /**
   * 12 as a fill — the high-contrast button. Gray 9 is a mid gray, so it reads as a weak fill;
   * a solid control that must dominate uses 12 and flips its label to `textInverted`.
   */
  solidStrong: gray.gray12,
  /** 1 — a label sitting on `solidStrong`. */
  textInverted: gray.gray1,

  /**
   * 11 — secondary text. 5.77:1 on `background`, so it clears WCAG AA at any size.
   * This is the lightest text allowed; nothing above step 11 may carry a word.
   */
  textMuted: gray.gray11,
  /** 12 — primary text. 15.88:1 on `background`. */
  text: gray.gray12,
} as const;

export type ColorToken = keyof typeof colors;
