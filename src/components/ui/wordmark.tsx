import { StyleSheet, View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { type as typeRoles } from '@/theme/typography';

/**
 * Curio signing its own name — caps struck wide, and nothing else.
 *
 * It goes where the platform speaks for itself and never where a house does: a card, a card's
 * detail, a brand's rewards are somebody else's name and this one stays off them.
 *
 * **Why this is a component and not a `Text` at the call site.** React Native applies
 * `letterSpacing` after the last glyph as well as between them, so a centred line of tracked caps
 * is drawn half a track to the left of where the eye puts it — at 13.6pt of tracking that is a
 * visible 7pt limp. Padding the same amount back onto the left edge cancels it exactly: the box
 * grows by one track on the left, the ink keeps its trailing track on the right, and the two
 * centres meet. It is a one-line fix that has to be got right once rather than remembered at every
 * call site, which is the whole argument for putting the mark here.
 */
export function Wordmark({ style, ...rest }: ViewProps) {
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Curio"
      style={[styles.lockup, style]}
      {...rest}
    >
      <Text variant="wordmark" style={styles.recentre}>
        CURIO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center' },
  /** See the note above: one track of left padding cancels the trailing track's pull. */
  recentre: { paddingLeft: typeRoles.wordmark.letterSpacing },
});
