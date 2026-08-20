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
 *
 * The scale is gray, and the one exception to that is `colors.point` — see its note below.
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
   * 색 면 위의 빈 자리.
   *
   * 리워드 카드가 컬렉션 색으로 꽉 찬 면이 되면서, **그 위에 놓이는 빈 칸을 그릴 회색이
   * 없어졌다** — 어느 단계를 써도 색 위에서는 얼룩이고, 아무것도 안 그리면 구멍이 된다.
   * 흰색을 아주 옅게 깐 것만이 "여기 자리가 있고 아직 비어 있다"를 색을 건드리지 않고
   * 말한다. `glassFill` 과 같은 이유로 흰색 알파이고, 다른 점은 겹치는 것이 사진이 아니라
   * 우리가 고른 색이라 훨씬 옅어도 된다는 것이다.
   */
  wellOnColor: whiteA.whiteA3,

  /**
   * 색 면 위의 구분선.
   *
   * `borderSubtle`(6단계)이 흰 페이지에서 하던 일 — 여기부터 저기까지가 다른 것이라고,
   * 밝기는 건드리지 않고 말하는 것 — 을 색 위에서 하는 값이다. 회색 단계로는 안 된다:
   * 어느 단계를 골라도 색 위에서는 선이 아니라 때처럼 보인다.
   *
   * `wellOnColor` 보다 한 걸음 진하다. 면은 넓어서 옅어도 자리가 보이지만 선은 1픽셀이라,
   * 같은 값으로는 그어 놓고도 그은 티가 나지 않는다.
   */
  ruleOnColor: whiteA.whiteA4,

  /**
   * 12 — the ink a scrim is made of, over artwork the app did not choose.
   *
   * Only the colour lives here; how dark the scrim gets is the scrim's own business, since that
   * depends on what it has to keep readable. Gray 12 rather than pure black because the palette
   * has no pure black and a scrim is not the place to introduce one.
   */
  scrimInk: gray.gray12,

  /**
   * The platform's point colour. A deep wine red, and the only hue in the file.
   *
   * **Nothing reads this yet, on purpose.** It is defined so that the value is written once and in
   * one place the day something needs it, rather than being pasted at a call site as a hex. Until
   * then the app stays gray, and that is not an oversight — a point colour earns its place by
   * marking the one thing on a screen that matters, and a screen that has not decided what that is
   * gets nothing.
   *
   * Not named `accent`: `Brand.accent` already owns that word, and it means the opposite thing —
   * a colour that belongs to a house and travels with its cards as data. This one belongs to Curio
   * and never touches a card's face.
   *
   * A single value rather than a scale. It has no hover step, no border step, and no text-on-point
   * step because none of those have been decided; when one is needed, derive it here beside this
   * entry instead of lightening the hex at the call site.
   */
  point: '#7B313D',
} as const;

export type ColorToken = keyof typeof colors;
