import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** `ProductTile` 이 놓일 자리. 도착해도 격자가 움직이지 않도록 같은 치수를 쓴다. */
export function ProductTileSkeleton() {
  return (
    <View style={styles.tile}>
      <Skeleton style={styles.frame} />
      <Skeleton style={styles.line} />
      <Skeleton style={[styles.line, styles.short]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: space[2] },
  frame: { width: '100%', aspectRatio: 1, borderRadius: radius.base },
  /** `label` 20 · `caption` 16 — 타일이 실제로 그리는 두 줄의 높이. */
  line: { height: 20, borderRadius: radius.small },
  short: { height: 16, width: '60%' },
});
