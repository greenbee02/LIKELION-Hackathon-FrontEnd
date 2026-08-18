import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/ui/glass-surface';
import { usePressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { colors, scaleAlpha } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The bar's own height, derived rather than picked: an icon (22) over a caption (16) with 4
 * between them is 42, the selected fill clears that by 4 on each side, and the bar clears the
 * fill by 8. 42 + 8 + 16 = 66. The safe-area inset sits under the bar, not inside it.
 *
 * Every one of those numbers is on the spacing scale, which is the point — the fill sits inside
 * the bar by a whole step rather than by whatever was left over after the icons were placed.
 */
export const TAB_BAR_HEIGHT = 66;

/**
 * How much room a screen must leave at the bottom so its last row clears the bar.
 *
 * The bar floats, so the navigator reserves nothing — the screen underneath runs full height and
 * pays for the overlap itself. Every scrolling tab screen ends its content with this value.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, space[2]) + space[4];
}

/**
 * A floating glass bar rather than a bordered strip across the bottom.
 *
 * The difference is what it says about the content: a strip is a wall the page stops at, and a
 * floating bar is a control resting on top of a page that continues underneath. This app is a
 * collection you scroll through, so the cards should keep going under the bar and stay visible
 * doing it — which is the whole reason the material is glass and not a solid fill.
 *
 * The active tab is marked twice: the label and icon step from 11 to 12, and a translucent fill
 * sits behind them. On a solid bar the step change alone would be enough, but over glass the
 * background under a tab is whatever happened to scroll there, so contrast cannot be relied on.
 * The fill is translucent for the same reason — an opaque step-3 patch would read as a hole
 * punched in the material.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <GlassSurface
      borderRadius={radius.full}
      style={[styles.bar, { bottom: Math.max(insets.bottom, space[2]) }]}
    >
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const tint = focused ? colors.text : colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TabItem
              key={route.key}
              label={label}
              tint={tint}
              focused={focused}
              icon={options.tabBarIcon}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </GlassSurface>
  );
}

/** Split out so each tab can hold its own press animation without the bar re-rendering. */
function TabItem({
  label,
  tint,
  focused,
  icon,
  onPress,
  onLongPress,
}: {
  label: string;
  tint: string;
  focused: boolean;
  icon: BottomTabBarProps['descriptors'][string]['options']['tabBarIcon'];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const press = usePressScale();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      {...press.handlers}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, focused && styles.itemFocused, press.style]}>
        {icon?.({ focused, color: tint, size: 22 })}
        <Text variant="caption" tone={focused ? 'default' : 'muted'}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    /* 24, well inside the screen's 16 gutter. The bar is not in the content column — it floats
       over it — and anything near the gutter reads as a block of the page rather than an object
       laid on top of one. Pulling it in past the text it covers is what makes it an object. */
    left: space[5],
    right: space[5],
    height: TAB_BAR_HEIGHT,
    /* The shadow comes from `GlassSurface` — every glass surface in the app floats the same way. */
  },
  /* One padding for all four sides, so the selected fill is inset by the same 8 whichever tab it
     lands on — including the first and the last, which sit against the bar's rounded ends. */
  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch', padding: space[2] },
  item: { flex: 1 },
  itemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    /* `full`, like the bar around it. Two curves inside one another only look intentional when
       they are concentric, and a fixed 12 inside a 33 reads as a rectangle that missed. Both
       being `full` gets it for free: the fill clears the bar by 8 on every side, so its radius
       lands at 25 against the bar's 33 — the same gap all the way round. */
    borderRadius: radius.full,
    gap: space[1],
  },
  itemFocused: { backgroundColor: scaleAlpha.grayA3 },
});
