import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors } from '@/theme/colors';
import { type as typeRoles, type TypeToken } from '@/theme/typography';

type Tone = 'default' | 'muted' | 'inverted';

const tones: Record<Tone, string> = {
  /** 12 — primary. */
  default: colors.text,
  /** 11 — secondary, and the lightest a word is allowed to be. */
  muted: colors.textMuted,
  /** 1 — a label riding on a `solidStrong` fill. */
  inverted: colors.textInverted,
};

export type TextProps = RNTextProps & {
  /** A role from the type scale. Sizes are not exposed on purpose — pick the role that fits. */
  variant?: TypeToken;
  tone?: Tone;
};

/**
 * Every word in the app goes through here.
 *
 * The point is that `fontSize` never appears at a call site: a role carries its size, line height
 * and weight together, and the three were chosen against each other. Colour is limited to the
 * three tones above for the same reason — steps 9 and 10 are fills, so there is no way to spell
 * "slightly lighter than muted" and that is deliberate.
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return <RNText style={[typeRoles[variant], { color: tones[tone] }, style]} {...rest} />;
}
