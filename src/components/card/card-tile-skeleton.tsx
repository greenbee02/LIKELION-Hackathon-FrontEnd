import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from './card-face';
import { Skeleton } from '@/components/ui/skeleton';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import { type as typeRoles } from '@/theme/typography';

/**
 * `CardTile` with the data taken out.
 *
 * The measurements are taken from the tile rather than guessed — the same aspect ratio, the same
 * gaps, line heights read off the type roles the real text uses — so the grid does not jump when
 * the cards land. A skeleton whose shape is close but not equal is worse than none: it promises
 * a layout and then breaks it.
 *
 * The name is two lines because that is what `CardTile` allows it. A one-line placeholder would
 * let every row below shift up the moment a long product name arrived.
 */
export function CardTileSkeleton() {
  return (
    <View style={styles.tile}>
      <Skeleton style={styles.face} />
      <View style={styles.meta}>
        <Skeleton style={styles.line} />
        <Skeleton style={[styles.line, styles.lineShort]} />
        <Skeleton style={styles.store} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1 },
  face: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  meta: { marginTop: space[2] },
  line: { height: typeRoles.label.fontSize, borderRadius: radius.full },
  lineShort: { width: '60%', marginTop: space[1] },
  store: {
    height: typeRoles.caption.fontSize,
    width: '45%',
    borderRadius: radius.full,
    marginTop: space[2],
  },
});
