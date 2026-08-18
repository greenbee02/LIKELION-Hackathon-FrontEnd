import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from './text';
import type { BrandButtonPalette } from '@/components/brand-marks/palettes';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

type Variant = 'solid' | 'outline';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /**
   * `solid` is the one thing a screen wants you to do; `outline` is everything else. There is no
   * third weight — a screen with two equally loud buttons has not decided what it is for.
   */
  variant?: Variant;
  /** A brand mark or icon that sits before the label, vertically centred. */
  leading?: ReactNode;
  /**
   * Only for a third-party sign-in button whose appearance the provider dictates — pass a palette
   * from `src/components/brand-marks/palettes.ts` and nothing else. It overrides `variant`, and
   * it is the one way colour reaches a control from outside the token file.
   */
  palette?: BrandButtonPalette;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * 52pt tall, which is where `radius.base` was measured against — the corner reads as softened at
 * this height and merely rounded at any other, so the height is fixed rather than derived from
 * padding.
 *
 * A pressed state moves the fill one step, never the size: nothing here scales or lifts, because
 * the card is the object that gets to move in this app and a button competing with it is noise.
 */
export function Button({
  label,
  onPress,
  variant = 'solid',
  leading,
  palette,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const inert = disabled || loading;
  const foreground = palette && !inert ? palette.foreground : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' ? styles.solid : styles.outline,
        pressed && !inert && (variant === 'solid' ? styles.solidPressed : styles.outlinePressed),
        palette &&
          !inert && {
            backgroundColor: pressed ? palette.backgroundPressed : palette.background,
            borderWidth: 0,
          },
        inert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={palette?.foreground ?? (variant === 'solid' ? colors.textInverted : colors.text)}
        />
      ) : (
        <View style={styles.row}>
          {leading ? <View style={styles.leading}>{leading}</View> : null}
          <Text
            variant="action"
            tone={variant === 'solid' && !inert ? 'inverted' : 'default'}
            style={foreground ? { color: foreground } : undefined}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  leading: { marginRight: space[3] },
  solid: { backgroundColor: colors.solidStrong },
  solidPressed: { backgroundColor: colors.solidStrongHover },
  outline: {
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  outlinePressed: { backgroundColor: colors.surface },
  /**
   * Disabled drops to a flat surface fill rather than fading the whole control: opacity would
   * take the label below step 11, and nothing in this app carries a word at less than that.
   */
  inert: { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
});
