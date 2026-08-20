import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Grid2X2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { failureCopy } from '@/lib/api/errors';
import { fetchProduct, type ProductResponse } from '@/lib/api/products';
import { assetUrl } from '@/lib/config';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        const next = await fetchProduct(id);
        if (!alive) return;
        setProduct(next);
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(failureCopy(e).note);
        setStatus('error');
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <NavBar title="상품 상세" fallback="/catalog/products" />
      {status === 'loading' ? <ProductDetailSkeleton /> : null}
      {status === 'error' ? (
        <EmptyState icon={Grid2X2} title="상품을 불러오지 못했습니다" note={error ?? '잠시 후 다시 시도해 주세요.'} action={{ label: '상품 목록으로', onPress: () => router.replace('/catalog/products') }} />
      ) : null}
      {status === 'ready' && product ? <ProductDetail product={product} /> : null}
    </Screen>
  );
}

function ProductDetail({ product }: { product: ProductResponse }) {
  const image = assetUrl(product.imageUrl);
  const rows = [
    ['브랜드', product.brandName],
    ['제품 번호', product.productCode],
    ['유형', product.offeringType],
    ['카테고리', product.category],
    ['테마', product.theme],
    ['시즌', product.season],
    ['지역', product.region],
    ['소재', product.material],
    ['색상', product.color],
    ['원산지', product.origin],
    ['체험 장소', product.experienceLocation],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroImage}>
          {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={200} /> : null}
          {!image ? <Text variant="caption" tone="muted">이미지 준비 중</Text> : null}
        </View>
        <Text variant="caption" tone="muted" style={styles.brand}>{product.brandName}</Text>
        <Text variant="title" style={styles.title}>{product.name}</Text>
        {product.limited ? <Text variant="caption" tone="muted" style={styles.limited}>한정판</Text> : null}
      </View>

      {product.description ? <Panel style={styles.panel}><Text variant="body">{product.description}</Text></Panel> : null}

      {rows.length > 0 ? (
        <Panel style={styles.panel}>
          {rows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
        </Panel>
      ) : null}

      {product.warrantyInfo || product.warrantyMonths || product.careInfo ? (
        <Panel style={styles.panel}>
          {product.warrantyMonths ? <DetailRow label="보증 기간" value={`${product.warrantyMonths}개월`} /> : null}
          {product.warrantyInfo ? <DetailRow label="보증 내용" value={product.warrantyInfo} /> : null}
          {product.careInfo ? <DetailRow label="케어" value={product.careInfo} /> : null}
        </Panel>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="caption" tone="muted" style={styles.detailLabel}>{label}</Text>
      <Text variant="body" style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ProductDetailSkeleton() {
  return (
    <>
      <Skeleton style={styles.heroSkeleton} />
      <Skeleton style={styles.textSkeleton} />
      <Skeleton style={styles.textSkeletonShort} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  hero: { marginTop: space[4] },
  heroImage: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  brand: { marginTop: space[4] },
  title: { marginTop: space[1] },
  limited: { marginTop: space[2] },
  panel: { marginTop: space[4], gap: space[2] },
  detailRow: { flexDirection: 'row', gap: space[4], paddingVertical: space[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  detailLabel: { width: 74 },
  detailValue: { flex: 1 },
  heroSkeleton: { marginTop: space[4], width: '100%', aspectRatio: 1.05, borderRadius: radius.base },
  textSkeleton: { width: '55%', height: 24, marginTop: space[5], borderRadius: radius.small },
  textSkeletonShort: { width: '35%', height: 18, marginTop: space[2], borderRadius: radius.small },
});
