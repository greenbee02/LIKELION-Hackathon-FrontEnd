import { Image } from 'expo-image';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { assetUrl } from '@/lib/config';
import type { ProductResponse } from '@/lib/api/products';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export function ProductTile({ product, onPress }: { product: ProductResponse; onPress: () => void }) {
  const image = assetUrl(product.imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.brandName} ${product.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.imageBox}>
        {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={200} /> : null}
        {!image ? <Text variant="caption" tone="muted">이미지 준비 중</Text> : null}
        {product.limited ? <View style={styles.badge}><Badge label="한정판" /></View> : null}
      </View>
      <View style={styles.copy}>
        <Text variant="caption" tone="muted" numberOfLines={1}>{product.brandName}</Text>
        <Text variant="body" numberOfLines={2} style={styles.name}>{product.name}</Text>
        <ArrowUpRight size={16} color={colors.textMuted} strokeWidth={1.5} style={styles.arrow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.72 },
  imageBox: {
    aspectRatio: 0.86,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: space[2], left: space[2] },
  copy: { position: 'relative', paddingTop: space[2], paddingRight: space[5] },
  name: { marginTop: space[1] },
  arrow: { position: 'absolute', right: 0, bottom: space[1] },
});
