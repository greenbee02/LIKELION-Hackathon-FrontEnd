/**
 * The colours a third-party sign-in button is required to wear.
 *
 * Same carve-out as the marks beside this file, and for the same reason: Apple's guidelines
 * specify a black button with a white glyph and white label, and re-drawing it in a gray step
 * would be both wrong to look at and a violation of the terms we agree to by using the mark. So
 * it lives here as data rather than as a token, and `Button` takes it as a prop.
 *
 * **Nothing that is ours may use these.** A palette here means "this button belongs to someone
 * else"; every Curio control gets its colour from `src/theme/colors.ts`.
 */
export type BrandButtonPalette = {
  background: string;
  /** Under the finger. Apple does not specify one, so this is a lifted black. */
  backgroundPressed: string;
  /** The label and the mark. */
  foreground: string;
};

/** Apple's black button — #000000 with white content, per their Sign in with Apple guidelines. */
export const appleButton: BrandButtonPalette = {
  background: '#000000',
  backgroundPressed: '#262626',
  foreground: '#FFFFFF',
};
