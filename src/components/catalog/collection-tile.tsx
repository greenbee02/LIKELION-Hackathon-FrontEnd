import { Image } from 'expo-image';
import { ArrowUpRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { assetUrl } from '@/lib/config';
import type { ProductCollectionResponse } from '@/lib/api/product-collections';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export function CollectionTile({
  collection,
  productCount,
  onPress,
}: {
  collection: ProductCollectionResponse;
  productCount?: number;
  onPress: () => void;
}) {
  const image = assetUrl(collection.coverImageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${collection.brandName} ${collection.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.imageBox}>
        {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={200} /> : null}
        {!image ? <View style={styles.fallback} /> : null}
      </View>
      <View style={styles.copy}>
        <Text variant="caption" tone="muted" numberOfLines={1}>{collection.brandName}</Text>
        <Text variant="heading" numberOfLines={2} style={styles.name}>{collection.name}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={styles.meta}>
          {[collection.season, collection.productionYear, productCount !== undefined ? `${productCount}개 상품` : null]
            .filter(Boolean)
            .join(' · ') || '공식 컬렉션'}
        </Text>
        <ArrowUpRight size={16} color={colors.textMuted} strokeWidth={1.5} style={styles.arrow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.72 },
  imageBox: {
    aspectRatio: 1.45,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, backgroundColor: colors.surfaceHover },
  copy: { position: 'relative', paddingTop: space[2], paddingRight: space[5] },
  name: { marginTop: space[1] },
  meta: { marginTop: space[1] },
  arrow: { position: 'absolute', right: 0, bottom: space[1] },
});
