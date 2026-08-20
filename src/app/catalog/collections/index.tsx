import { useRouter } from 'expo-router';
import { Layers3 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CollectionTile } from '@/components/catalog/collection-tile';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { failureCopy } from '@/lib/api/errors';
import { fetchProductCollections, type ProductCollectionResponse } from '@/lib/api/product-collections';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export default function OfficialCollectionsScreen() {
  const router = useRouter();
  const [collections, setCollections] = useState<ProductCollectionResponse[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        const next = await fetchProductCollections();
        if (!alive) return;
        setCollections(next);
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(failureCopy(e).note);
        setStatus('error');
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  return (
    <Screen scroll header={<NavBar title="공식 컬렉션" fallback="/catalog" />} contentContainerStyle={styles.content}>
      <Text variant="body" tone="muted" style={styles.intro}>
        브랜드가 선별한 상품 묶음입니다. 컬렉션을 완성하면 리워드 진행률에도 반영됩니다.
      </Text>

      {status === 'loading' ? <CollectionSkeleton /> : null}
      {status === 'error' ? <EmptyState icon={Layers3} title="공식 컬렉션을 불러오지 못했습니다" note={error ?? '잠시 후 다시 시도해 주세요.'} /> : null}
      {status === 'ready' && collections.length === 0 ? <EmptyState icon={Layers3} title="공식 컬렉션이 없습니다" /> : null}
      {status === 'ready' && collections.length > 0 ? (
        <View style={styles.grid}>
          {collections.map((collection) => (
            <CollectionTile
              key={collection.id}
              collection={collection}
              onPress={() => router.push({ pathname: '/catalog/collections/[id]', params: { id: collection.id } })}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function CollectionSkeleton() {
  return <View style={styles.grid}>{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} style={styles.skeleton} />)}</View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  intro: { marginTop: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[3], rowGap: space[6], marginTop: space[6] },
  skeleton: { width: '47%', aspectRatio: 1.45, borderRadius: radius.base },
});
