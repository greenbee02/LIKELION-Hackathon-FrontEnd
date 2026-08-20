import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Layers3 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProductTile } from '@/components/catalog/product-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { failureCopy } from '@/lib/api/errors';
import { fetchCollectionProducts, fetchProductCollection, type CollectionItemResponse, type ProductCollectionResponse } from '@/lib/api/product-collections';
import { assetUrl } from '@/lib/config';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export default function OfficialCollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<ProductCollectionResponse | null>(null);
  const [items, setItems] = useState<CollectionItemResponse[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        const [next, products] = await Promise.all([fetchProductCollection(id), fetchCollectionProducts(id)]);
        if (!alive) return;
        setCollection(next);
        setItems(products);
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(failureCopy(e).note);
        setStatus('error');
      }
    };
    void load();
    return () => { alive = false; };
  }, [id]);

  return (
    <Screen scroll header={<NavBar title="컬렉션 상세" fallback="/catalog/collections" />} contentContainerStyle={styles.content}>
      {status === 'loading' ? <CollectionDetailSkeleton /> : null}
      {status === 'error' ? <EmptyState icon={Layers3} title="컬렉션을 불러오지 못했습니다" note={error ?? '잠시 후 다시 시도해 주세요.'} action={{ label: '컬렉션 목록으로', onPress: () => router.replace('/catalog/collections') }} /> : null}
      {status === 'ready' && collection ? <CollectionDetail collection={collection} items={items} onProductPress={(productId) => router.push({ pathname: '/catalog/products/[id]', params: { id: productId } })} /> : null}
    </Screen>
  );
}

function CollectionDetail({
  collection,
  items,
  onProductPress,
}: {
  collection: ProductCollectionResponse;
  items: CollectionItemResponse[];
  onProductPress: (id: string) => void;
}) {
  const image = assetUrl(collection.coverImageUrl);
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.cover}>
          {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={200} /> : null}
        </View>
        <Text variant="caption" tone="muted" style={styles.brand}>{collection.brandName}</Text>
        <Text variant="title" style={styles.title}>{collection.name}</Text>
        {collection.description ? <Text variant="body" tone="muted" style={styles.description}>{collection.description}</Text> : null}
        <Text variant="caption" tone="muted" style={styles.meta}>{`${items.length}개 상품${collection.season ? ` · ${collection.season}` : ''}`}</Text>
      </View>
      {items.length > 0 ? (
        <View style={styles.grid}>
          {items.map((item) => <ProductTile key={item.product.id} product={item.product} onPress={() => onProductPress(item.product.id)} />)}
        </View>
      ) : <EmptyState icon={Layers3} title="이 컬렉션의 상품이 없습니다" />}
    </>
  );
}

function CollectionDetailSkeleton() {
  return <><Skeleton style={styles.coverSkeleton} /><Skeleton style={styles.titleSkeleton} /><Skeleton style={styles.textSkeleton} /></>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  hero: { marginTop: space[4] },
  cover: { width: '100%', aspectRatio: 1.45, borderRadius: radius.base, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  brand: { marginTop: space[4] },
  title: { marginTop: space[1] },
  description: { marginTop: space[3] },
  meta: { marginTop: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[3], rowGap: space[6], marginTop: space[6] },
  coverSkeleton: { width: '100%', aspectRatio: 1.45, borderRadius: radius.base, marginTop: space[4] },
  titleSkeleton: { width: '55%', height: 26, borderRadius: radius.small, marginTop: space[5] },
  textSkeleton: { width: '80%', height: 18, borderRadius: radius.small, marginTop: space[2] },
});
