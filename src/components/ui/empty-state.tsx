import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Text } from './text';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

type EmptyStateProps = {
  /** A lucide icon component. Passed as a type, not an element, so the size and colour stay here. */
  icon?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  note: string;
  /** The one thing that would fill this screen. Omit it when there is nothing the customer can do. */
  action?: { label: string; onPress: () => void };
};

/**
 * What a screen shows when it loaded correctly and there is nothing in it.
 *
 * Distinct from an error, and distinct from a skeleton: this is a finished state, so it says what
 * would put something here rather than apologising. When the answer is a single action it gets a
 * solid button, because on an otherwise empty screen there is nothing for it to compete with.
 *
 * The icon is drawn at step 8 — the strongest border, the weakest thing that is not text. It marks
 * the spot without becoming the subject.
 */
export function EmptyState({ icon: Icon, title, note, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={40} color={colors.borderStrong} strokeWidth={1.5} /> : null}
      <Text variant="heading" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" tone="muted" style={styles.note}>
        {note}
      </Text>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  title: { marginTop: space[4] },
  note: { marginTop: space[2], textAlign: 'center' },
  action: { marginTop: space[5], alignSelf: 'stretch' },
});
