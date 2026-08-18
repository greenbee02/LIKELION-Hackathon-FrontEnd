import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

/**
 * The one implementation of glass, so every floating surface in the app is the same material.
 *
 * Two backends, one appearance. iOS 26 has the real thing — a live refractive material that
 * reacts to what scrolls under it — and `expo-glass-effect` exposes it; everywhere else gets a
 * blur with a near-white veil over it, which is the same idea rendered cheaply. The switch is
 * made once here rather than at each call site, because a screen should ask for glass and not
 * have to know which platform it landed on.
 *
 * "Crisp and near-white, not a heavy frost" is the brief, and the veil is what enforces it: a
 * blur alone leaves whatever is underneath legible as shapes, which turns a tab bar into a
 * smeared window. 70% white over the blur keeps the material readable as a surface while the
 * motion beneath it still shows through.
 *
 * The shadow is not decoration, it is the other half of the material. Over a photograph the blur
 * does all the work of separating the surface from what it covers; over a white page the blur has
 * nothing to blur and the veil is the same colour as the ground, so without a shadow the surface
 * disappears and what is left reads as flat type on a page. Every glass surface in the app floats,
 * so the shadow lives here rather than being remembered at each call site. Callers that need a
 * heavier one pass it in `style`, which lands on the outer view and wins.
 *
 * The clipping and the shadow are on different views on purpose: `overflow: 'hidden'` on the view
 * that casts the shadow would clip the shadow off on some platforms.
 *
 * `colorScheme="light"` is passed on purpose — the app has no dark mode, and left on `auto` the
 * iOS material would turn dark on a device set to dark, which is the one place a system default
 * could put dark chrome into a light-only app.
 */
export function GlassSurface({
  children,
  style,
  /** Matched to the surface's own corner radius — the blur has to be clipped to the same shape. */
  borderRadius,
}: {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  borderRadius: number;
}) {
  const clip = { borderRadius, overflow: 'hidden' as const };

  const inner = isLiquidGlassAvailable() ? (
    <GlassView style={[styles.fill, clip]} glassEffectStyle="regular" colorScheme="light">
      {children}
    </GlassView>
  ) : (
    <View style={[styles.fill, clip]}>
      <BlurView
        intensity={40}
        tint="light"
        /* Android renders a flat translucent view unless a blur method is named; this one is
           the real blur on SDK 31+ and falls back on its own below that. */
        blurMethod="dimezisBlurViewSdk31Plus"
        style={styles.layer}
      />
      <View style={[styles.layer, styles.veil]} />
      <View style={[styles.layer, clip, styles.edge]} pointerEvents="none" />
      {children}
    </View>
  );

  return <View style={[styles.shadow, { borderRadius }, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  /** Fills the shadow-casting parent, whatever size that parent was given. */
  fill: { flex: 1, width: '100%', height: '100%' },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  veil: { backgroundColor: colors.glassFill },
  edge: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassEdge },
});
