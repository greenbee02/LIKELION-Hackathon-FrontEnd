/**
 * Corner radius.
 *
 * 12 is the base, chosen against a reference button: its corner measured a radius of roughly
 * 0.22 of the element's height, which lands on 12 for the ~52px controls this app uses. It reads
 * as softened rather than rounded, and it is the value to reach for unless there is a reason not to.
 *
 * `full` is not a larger step on the same scale — it is a different shape. A number cannot express
 * "half of whatever this element's height turns out to be", so pills and circles get their own
 * token rather than a big number sprinkled at call sites.
 *
 * `small` exists because 12 is not a proportion, it is a length: on a 52pt button it softens a
 * corner, and on a 22pt checkbox it rounds the element into a circle. Anything under roughly 28pt
 * needs its own value to read as the same shape family, and 4 is that value.
 */
export const radius = {
  /** 4 — elements too small for `base`, where 12 would round them into circles: checkboxes, badges. */
  small: 4,
  /** The default: buttons, inputs, cards, panels, list rows. */
  base: 12,
  /** A pill or a circle — search fields, icon-only buttons, tags. */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
