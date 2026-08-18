import { Easing } from 'react-native-reanimated';

/**
 * Motion, in one place, for the same reason colour and type are.
 *
 * There is exactly one gesture defined here — what a control does under a finger — and every
 * pressable in the app runs it. Durations and curves picked per component are how an interface
 * ends up feeling like several interfaces: the tab bar snappier than the buttons, the cards
 * slower than both, none of it decided.
 */
export const motion = {
  /**
   * How far a control grows while held.
   *
   * Big enough to be unmistakable rather than merely felt — the demo is watched from across a
   * room, and 4% was a movement only the person holding the phone could see.
   *
   * At 16% a grid tile is wider than the 12pt gutter beside it and laps over the card next to it.
   * That is why anything that grows also raises itself while held — without that, the card being
   * pressed would slide *under* its neighbour, which is the one way this effect can look broken
   * rather than lively.
   */
  pressScale: 1.16,

  /** Fast on the way in — the response has to feel simultaneous with the touch. */
  pressInDuration: 90,
  /** Slower on the way out, so releasing settles rather than snaps back. */
  pressOutDuration: 160,

  /** Decelerating, both directions: motion that starts fast and eases to rest reads as physical. */
  easing: Easing.out(Easing.quad),
} as const;
