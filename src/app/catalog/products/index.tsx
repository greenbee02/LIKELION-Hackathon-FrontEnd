import { useRouter } from 'expo-router';
import { ChevronDown, Filter, Grid2X2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProductTile } from '@/components/catalog/product-tile';
import { Button } from '@/components/ui/button';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { failureCopy } from '@/lib/api/errors';
import { fetchProducts, type ProductPage, type ProductQuery } from '@/lib/api/products';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

const SIZE = 12;
const OFFERING_OPTIONS: DropdownOption[] = [
  { value: 'all', label: '전체 유형' },
  { value: 'PRODUCT', label: '상품' },
  { value: 'ART', label: '아트' },
  { value: 'GASTRONOMY', label: '미식' },
  { value: 'TRAVEL', label: '여행' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'OTHER', label: '기타' },
];
const LIMITED_OPTIONS: DropdownOption[] = [
  { value: 'all', label: '한정 여부' },
  { value: 'true', label: '한정판만' },
  { value: 'false', label: '일반 상품만' },
];

type LoadStatus = 'loading' | 'ready' | 'error';

export default function ProductsScreen() {
  const router = useRouter();
  const [offering, setOffering] = useState('all');
  const [limited, setLimited] = useState('all');
  const [category, setCategory] = useState('');
  const [theme, setTheme] = useState('');
  const [query, setQuery] = useState<ProductQuery>({ page: 0, size: SIZE });
  const [result, setResult] = useState<ProductPage | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setStatus('loading');
      setError(null);
      try {
        const next = await fetchProducts(query);
        if (!alive) return;
        setResult(next);
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
  }, [attempt, query]);

  const apply = () => {
    setQuery({
      page: 0,
      size: SIZE,
      ...(offering !== 'all' ? { offeringType: offering } : {}),
      ...(limited !== 'all' ? { limited: limited === 'true' } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(theme.trim() ? { theme: theme.trim() } : {}),
    });
  };

  const movePage = (page: number) => setQuery((current) => ({ ...current, page }));
  const selectedOffering = OFFERING_OPTIONS.find((option) => option.value === offering);
  const selectedLimited = LIMITED_OPTIONS.find((option) => option.value === limited);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <NavBar title="상품" fallback="/catalog" />
      <Text variant="body" tone="muted" style={styles.intro}>
        브랜드의 상품과 경험을 둘러보고 상세 정보를 확인해 보세요.
      </Text>

      <Panel style={styles.filterPanel}>
        <View style={styles.filterTitle}>
          <Filter size={18} color={colors.text} strokeWidth={1.5} />
          <Text variant="label">필터</Text>
        </View>
        <View style={styles.pickerRow}>
          <Dropdown value={offering} onValueChange={setOffering} options={OFFERING_OPTIONS} accessibilityLabel="상품 유형">
            <FilterPicker label={selectedOffering?.label ?? '전체 유형'} />
          </Dropdown>
          <Dropdown value={limited} onValueChange={setLimited} options={LIMITED_OPTIONS} accessibilityLabel="한정 여부">
            <FilterPicker label={selectedLimited?.label ?? '한정 여부'} />
          </Dropdown>
        </View>
        <View style={styles.inputRow}>
          <Input label="카테고리" value={category} onChangeText={setCategory} placeholder="예: BAG" style={styles.input} autoCapitalize="characters" />
          <Input label="테마" value={theme} onChangeText={setTheme} placeholder="예: ICON" style={styles.input} />
        </View>
        <Button label="필터 적용" variant="outline" onPress={apply} leading={<Grid2X2 size={16} color={colors.text} />} />
      </Panel>

      {status === 'error' ? (
        <EmptyState icon={Grid2X2} title="상품을 불러오지 못했습니다" note={error ?? '잠시 후 다시 시도해 주세요.'} action={{ label: '다시 시도', onPress: () => setAttempt((value) => value + 1) }} />
      ) : status === 'loading' && !result ? (
        <ProductSkeleton />
      ) : result && result.items.length > 0 ? (
        <>
          <View style={styles.resultHeader}>
            <Text variant="caption" tone="muted">{`${result.totalElements}개 상품`}</Text>
            {result.totalPages > 1 ? <Text variant="caption" tone="muted">{`${result.page + 1} / ${result.totalPages}`}</Text> : null}
          </View>
          <View style={styles.grid}>
            {result.items.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                onPress={() => router.push({ pathname: '/catalog/products/[id]', params: { id: product.id } })}
              />
            ))}
          </View>
          {result.totalPages > 1 ? (
            <View style={styles.pagination}>
              <Button label="이전" variant="outline" disabled={result.page === 0} onPress={() => movePage(result.page - 1)} style={styles.pageButton} />
              <Button label="다음" variant="outline" disabled={result.page >= result.totalPages - 1} onPress={() => movePage(result.page + 1)} style={styles.pageButton} />
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState icon={Grid2X2} title="조건에 맞는 상품이 없습니다" note="필터를 바꾸면 다른 상품을 확인할 수 있습니다." />
      )}
    </Screen>
  );
}

function FilterPicker({ label }: { label: string }) {
  return (
    <View style={styles.picker}>
      <Text variant="label" tone="muted" numberOfLines={1}>{label}</Text>
      <ChevronDown size={15} color={colors.textMuted} />
    </View>
  );
}

function ProductSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} style={styles.skeleton} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[7] },
  intro: { marginTop: space[2] },
  filterPanel: { marginTop: space[5], gap: space[3] },
  filterTitle: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: 170,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputRow: { flexDirection: 'row', gap: space[3] },
  input: { flex: 1, minWidth: 0 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[6] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[3], rowGap: space[6], marginTop: space[3] },
  skeleton: { width: '47%', aspectRatio: 0.86, borderRadius: radius.base },
  pagination: { flexDirection: 'row', gap: space[3], marginTop: space[7] },
  pageButton: { flex: 1 },
});
