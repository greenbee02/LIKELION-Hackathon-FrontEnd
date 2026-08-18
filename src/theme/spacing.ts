/**
 * Spacing, on a 4pt scale.
 *
 * 4 is the smallest step because a dense card UI needs to nudge things by less than 8 — the gap
 * between a product name and the date under it is not the same gap as the one between two cards.
 * Above 16 the steps widen, since large spacing is read as "separate" rather than measured.
 *
 * Use the number for gaps, padding, and margins. Screen gutters are `space[4]` (16); a card's
 * inner padding is `space[3]` (12); unrelated sections are `space[6]` (32) apart.
 */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
} as const;

export type SpaceToken = keyof typeof space;
