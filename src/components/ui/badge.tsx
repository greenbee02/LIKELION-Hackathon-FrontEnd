import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * One word about the thing beside it — 한정판, and whatever joins it later.
 *
 * Not a control: it takes no press and carries no action, which is the whole difference between
 * this and a tag in a filter row. It states a fact the object cannot state itself.
 *
 * A filled surface rather than an outline. The palette has no colour to mark something special
 * with, so the only way a badge can register at all is by sitting on a different ground than the
 * page — an outlined badge in gray next to gray text is a rectangle nobody reads. Its text stays
 * at step 12: this is a claim about the product, not metadata about it.
 *
 * `radius.small`, and this is the case that token was written for — 24pt tall, where `base` would
 * round it into a lozenge.
 */
export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.small,
    backgroundColor: colors.surface,
  },
});
