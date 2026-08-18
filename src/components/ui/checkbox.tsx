import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The width of the control column, shared by both marks so the box and the ticks below it line up
 * and the labels start at the same x. One constant rather than two equal numbers: the alignment
 * is the point, and two numbers drift.
 */
const CONTROL = 20;

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  /** The row's label. A node rather than a string so a line can carry more than one weight. */
  children: ReactNode;
  /**
   * `box` is a control the customer operates directly; `mark` is a bare tick that reports state
   * for one line of a group the box above it governs. The distinction is the reference's, and it
   * is a good one — a screen full of identical boxes hides which one actually does the work.
   */
  mark?: 'box' | 'mark';
  style?: ViewStyle;
};

/**
 * Built here rather than pulled from `@rn-primitives/*`: a checkbox has no open/close, no focus
 * trap and nothing to dismiss, so a primitive would supply nothing this does not already do. The
 * accessibility contract is the part that matters and it is stated explicitly below.
 *
 * The box uses `radius.small`, the token this component is the reason for: `radius.base` is 12,
 * which on a 22pt square is not a softened corner but a circle.
 *
 * The row takes no pressed fill. A checkbox already answers a press by changing its mark, and a
 * highlight sweeping a stack of consent lines under the thumb reads as the list scrolling rather
 * than as one line being chosen.
 */
export function Checkbox({ checked, onToggle, children, mark = 'box', style }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[styles.row, style]}
    >
      {mark === 'box' ? (
        <View style={[styles.box, checked && styles.boxChecked]}>
          {/* Nearly the full width of the box: the tick is what reads as "ticked", and a small
              one inside a filled square looks like a square with a smudge on it. */}
          <Check size={15} color={checked ? colors.textInverted : 'transparent'} strokeWidth={3} />
        </View>
      ) : (
        <View style={styles.markSlot}>
          <Check
            size={16}
            color={checked ? colors.text : colors.borderStrong}
            strokeWidth={checked ? 2.5 : 2}
          />
        </View>
      )}

      <View style={styles.label}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[2],
  },
  box: {
    width: CONTROL,
    height: CONTROL,
    borderRadius: radius.small,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.solidStrong, borderColor: colors.solidStrong },
  markSlot: { width: CONTROL, alignItems: 'center' },
  label: { flex: 1, marginLeft: space[3] },
});
