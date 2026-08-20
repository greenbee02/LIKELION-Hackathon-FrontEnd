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
  /**
   * 제목만으로 부족할 때의 한 줄. **없으면 그리지 않는다** — 제목이 이미 다 말한 화면에
   * 설명을 덧붙이면 같은 말을 두 번 하게 되고, 빈 화면에서는 그 반복이 더 크게 보인다.
   */
  note?: string;
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
      {note ? (
        <Text variant="body" tone="muted" style={styles.note}>
          {note}
        </Text>
      ) : null}
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
