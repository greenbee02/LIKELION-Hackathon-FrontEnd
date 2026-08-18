import { StyleSheet, View } from 'react-native';

import { Screen } from './screen';
import { Text } from './text';
import { space } from '@/theme/spacing';

/**
 * Scaffolding. Each tab gets one until its real screen lands, so the shell can be walked from the
 * first day instead of a tab pressing into a blank window. Delete the call site, not this file,
 * as each screen is built — the last one to go takes the file with it.
 */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="title">{title}</Text>
        <Text variant="body" tone="muted" style={styles.note}>
          {note}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space[2], textAlign: 'center' },
});
