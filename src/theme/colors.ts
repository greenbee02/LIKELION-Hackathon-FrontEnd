import { gray, grayA, whiteA } from '@radix-ui/colors';

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

/** Translucent white, the only non-gray in the file. It exists for glass — see `colors.glass`. */
export const scaleAlphaLight = whiteA;

export const colors = {
  /** 1 — the app background. */
  background: gray.gray1,
  /**
   * 3 — a surface that stands in for something not there yet, or holds one thing up.
   *
   * Not a panel: `Panel` draws a border and keeps the page's own brightness, because a list of
   * filled boxes turns the whole page gray. What is left here is the opposite case — a square
   * waiting for artwork to load, the plate a claim code is set on. Those have to read as *matter*
   * rather than as an outline, so they take the step a fill has.
   *
   * The same value as `surface`, deliberately. They are one colour doing two jobs — a control at
   * rest and a stand-in surface — and the day those need to differ, this is the one to move.
   */
  backgroundSubtle: gray.gray3,

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
  /**
   * 11 — `solidStrong` under the finger. Lighter rather than darker, because 12 is already the
   * darkest step on the scale and a press has to move somewhere.
   */
  solidStrongHover: gray.gray11,
  /** 1 — a label sitting on `solidStrong`. */
  textInverted: gray.gray1,

  /**
   * 11 — secondary text. 5.77:1 on `background`, so it clears WCAG AA at any size.
   * This is the lightest text allowed; nothing above step 11 may carry a word.
   */
  textMuted: gray.gray11,
  /** 12 — primary text. 15.88:1 on `background`. */
  text: gray.gray12,

  /**
   * Glass — a surface that floats over content rather than sitting in the page.
   *
   * These three are the only entries here that are not a step on the gray scale, because glass is
   * not a colour: it is a blur, a veil over it, and an edge. The veil is white at 70% rather than
   * a gray step, since a step would be opaque and the whole point is that what is underneath
   * still shows. `glassEdge` is translucent for the same reason — a solid step-7 hairline over a
   * photograph reads as a drawn line, and over a white page it disappears.
   *
   * Only `GlassSurface` should read these. A component reaching for them directly is a component
   * about to reinvent it slightly differently.
   */
  glassFill: whiteA.whiteA9,
  glassEdge: grayA.grayA4,
  /** What a floating surface casts. gray 12, dropped at low opacity by the surface itself. */
  glassShadow: gray.gray12,

  /**
   * 12 — the ink a scrim is made of, over artwork the app did not choose.
   *
   * Only the colour lives here; how dark the scrim gets is the scrim's own business, since that
   * depends on what it has to keep readable. Gray 12 rather than pure black because the palette
   * has no pure black and a scrim is not the place to introduce one.
   */
  scrimInk: gray.gray12,
} as const;

export type ColorToken = keyof typeof colors;
