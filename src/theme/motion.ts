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

  /**
   * How long a card takes to turn over.
   *
   * The second gesture in the app, and the only one that is not a response to a finger already
   * moving. A press has to feel simultaneous with the touch, so it is fast and decelerating; a
   * flip is the object itself rotating after the finger has let go, and it starts and ends at
   * rest. That is why it gets its own curve rather than borrowing `easing` — the same argument
   * this file makes for keeping durations out of components applies to keeping two genuinely
   * different motions from being spelled the same way.
   *
   * 420 is long enough that the turn is legible as a rotation from across a room, which is where
   * the demo is watched from, and short enough that nobody waits for it. Under about 300 the card
   * reads as swapping rather than turning, which loses the only thing the gesture is for.
   */
  flipDuration: 420,

  /** Starts and ends at rest, because the object it moves was not moving and will stop. */
  flipEasing: Easing.inOut(Easing.cubic),

  /**
   * How far away the eye is from the card being turned.
   *
   * Without it the rotation is an orthographic squeeze — the card gets narrower and springs back,
   * which reads as a horizontal scale rather than a turn. 900 is close enough that the leading
   * edge visibly swings toward the viewer and far enough that the card does not distort into a
   * wedge halfway through.
   */
  flipPerspective: 900,

  /**
   * How long a panel takes to settle after the finger lets go of it.
   *
   * It borrows `easing` rather than the flip's curve, and the reason is the same one that gave
   * the flip its own: a sheet dragged upward is already moving when the finger leaves, so it has
   * to decelerate out of a motion in progress rather than start from rest. Only the duration is
   * its own — 260, longer than a press because it covers real distance and shorter than a flip
   * because it is finishing a movement the customer already made rather than performing one.
   *
   * Opening by tap starts from rest and so is the one case this curve is not written for. It is
   * the minority gesture on a control whose whole affordance is a grabber, and giving the same
   * control two curves depending on how it was reached would be worse than the mismatch.
   */
  sheetDuration: 260,
} as const;
