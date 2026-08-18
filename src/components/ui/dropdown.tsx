import * as DropdownMenu from '@rn-primitives/dropdown-menu';
import { Check } from 'lucide-react-native';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { GlassSurface } from './glass-surface';
import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export type DropdownOption = {
  value: string;
  label: string;
  /** A secondary fact about the option — a count, a date. Never the option's identity. */
  hint?: string;
  /**
   * A heading printed once above the first option carrying it. Options sharing a group must be
   * adjacent, since the heading is drawn where the value changes rather than by collecting them.
   */
  group?: string;
};

/** Keeps the menu off the screen edges when the trigger sits near one. */
const EDGE_INSETS = { top: space[4], right: space[4], bottom: space[4], left: space[4] };

/**
 * A single-choice menu hung off whatever the caller passes as its trigger.
 *
 * Behaviour is `@rn-primitives/dropdown-menu` and appearance is ours, which is the split the
 * project has settled on: open/close, the outside-press dismiss, the focus handling and the
 * portal are exactly the parts that are tedious to get right and identical everywhere, so they
 * are not written here. What is written here is the surface it wears.
 *
 * `RadioGroup` rather than a list of items with an `onPress` each — the menu is a single choice
 * with a current value, and saying so gives the right accessibility roles for free instead of
 * making every call site remember to announce them.
 *
 * The menu floats over content, so it is glass, the same material as the tab bar. A floating
 * surface that were opaque here and translucent there would read as two different apps.
 */
export function Dropdown({
  value,
  onValueChange,
  options,
  children,
  accessibilityLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  /** The trigger's contents. It is pressable already — do not wrap it in another Pressable. */
  children: ReactNode;
  accessibilityLabel: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger accessibilityLabel={accessibilityLabel}>{children}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Overlay style={styles.overlay}>
          <DropdownMenu.Content
            align="start"
            side="bottom"
            sideOffset={space[2]}
            insets={EDGE_INSETS}
            style={styles.anchor}
          >
            <GlassSurface borderRadius={radius.base} style={styles.menu}>
              <DropdownMenu.RadioGroup
                value={value}
                onValueChange={onValueChange}
                style={styles.group}
              >
                {options.map((option, i) => (
                  <Fragment key={option.value}>
                    {option.group && option.group !== options[i - 1]?.group ? (
                      <Text variant="caption" tone="muted" style={styles.heading}>
                        {option.group}
                      </Text>
                    ) : null}
                    <DropdownMenu.RadioItem value={option.value} style={styles.item}>
                      <Text variant="body" numberOfLines={1} style={styles.itemLabel}>
                        {option.label}
                      </Text>
                      {option.hint ? (
                        <Text variant="caption" tone="muted" style={styles.itemHint}>
                          {option.hint}
                        </Text>
                      ) : null}
                      {/* The tick marks the current choice; nothing else in the row changes, so a
                          glance down the column reads as one list rather than one bolded row. */}
                      <Check
                        size={16}
                        color={option.value === value ? colors.text : 'transparent'}
                        strokeWidth={2.5}
                      />
                    </DropdownMenu.RadioItem>
                  </Fragment>
                ))}
              </DropdownMenu.RadioGroup>
            </GlassSurface>
          </DropdownMenu.Content>
        </DropdownMenu.Overlay>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const styles = StyleSheet.create({
  /** Catches the press that dismisses the menu. No scrim: the menu is small and the page stays. */
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  /** The primitive positions this against the trigger; the visible surface is the child. */
  anchor: { minWidth: 220 },
  /* A heavier shadow than `GlassSurface` gives by default: a menu sits above everything else on
     the screen, including the tab bar, and has to read that way. */
  menu: {
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  group: { paddingVertical: space[1] },
  /* A heading rather than a rule between groups. A line says "these are separate"; a word says
     what they are separated by, which is the thing a reader actually needs in a mixed list. */
  heading: {
    paddingHorizontal: space[3],
    paddingTop: space[3],
    paddingBottom: space[1],
  },
  /* No fixed height: the row is padding plus a line of body text, so it grows with the type scale
     instead of clipping when a role changes. */
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    gap: space[2],
  },
  itemLabel: { flexShrink: 1 },
  /** Pushed to the right so the ticks line up in a column whatever the labels are. */
  itemHint: { marginLeft: 'auto' },
});
