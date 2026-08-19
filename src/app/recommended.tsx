import { useCallback } from 'react';
import { Sparkles } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ProductTile } from '@/components/product/product-tile';
import { ProductTileSkeleton } from '@/components/product/product-tile-skeleton';
import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Sheet, useSheetSpace } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useCards } from '@/lib/cards-store';
import { fetchRecommendations, type Recommendation } from '@/lib/recommendations';
import { useResource } from '@/lib/use-resource';
import { space } from '@/theme/spacing';

const COLUMNS = 2;

/**
 * 추천 카드 — 아직 갖지 않은 것.
 *
 * 컬렉션 탭이 "무엇을 가졌는가"라면 여기는 그 반대편이다. 그래서 탭이 아니라 탭에서 한 번
 * 들어와야 하는 화면이다 — 아카이브를 열었을 때 가진 것보다 안 가진 것이 먼저 보이면 그건
 * 소장품이 아니라 상점이다.
 *
 * **목록은 지어낸 것이 아니다.** 공식 컬렉션이 무슨 상품으로 이루어지는지는 서버가 이미
 * 알려주고 있고, 거기서 가진 것을 빼면 남는 것이 이 목록이다. 그래서 여기 적힌 "2장 남음"은
 * 리워드 화면이 말하는 "앞으로 2장"과 같은 수다 — 같은 분모에서 나왔기 때문이다.
 *
 * 살 곳으로 데려가지 않는다. 상품 타일은 누를 수 없다 — 이 앱에는 상점이 없고, 카드는 매장에서
 * 사고 영수증을 스캔해야 생긴다. 누르면 아무 데도 못 가는 타일보다 처음부터 누를 수 없는
 * 타일이 정직하다.
 */
export default function RecommendedScreen() {
  const { cards } = useCards();
  const bottomSpace = useSheetSpace();

  const load = useCallback(() => fetchRecommendations(cards), [cards]);
  const { status, data, error } = useResource<Recommendation[]>(load);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/" />
    </View>
  );
  const header = <PageHeader title="추천 카드" />;

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <EmptyState
          icon={Sparkles}
          title="추천을 불러오지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <View style={styles.grid}>
          {['s1', 's2'].map((key) => (
            <View key={key} style={styles.row}>
              <ProductTileSkeleton />
              <ProductTileSkeleton />
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  const items = data ?? [];

  if (items.length === 0) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <EmptyState
          icon={Sparkles}
          title="모을 수 있는 카드를 모두 모으셨습니다"
          note={'새로운 컬렉션이 열리면\n여기에 다음 카드가 나타납니다.'}
        />
      </Screen>
    );
  }

  const rows: (Recommendation | null)[][] = [];
  for (let i = 0; i < items.length; i += COLUMNS) {
    const row: (Recommendation | null)[] = items.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  return (
    <Screen gutter={false}>
      <ScrollView
        contentContainerStyle={[styles.gutter, allowPressOverflow, { paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {nav}
        {header}

        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={row[0]?.product.id ?? `row-${rowIndex}`} style={styles.row}>
              {row.map((item, index) =>
                item ? (
                  <ProductTile
                    key={item.product.id}
                    product={item.product}
                    note={`${item.collection.name} · ${item.remaining}장 남음`}
                  />
                ) : (
                  <View key={`blank-${index}`} style={styles.blank} />
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 목록이 어디서 나왔는지. 추천이라는 말은 근거를 대야 추천이고, 대지 못하면 광고다. */}
      <Sheet title="추천 기준">
        <Text variant="body" tone="muted">
          {'하우스가 묶어둔 공식 컬렉션에서 이미 가진 카드를 뺀 목록입니다.\n' +
            '거의 다 모은 세트가 먼저 나옵니다.'}
        </Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: space[4], paddingTop: space[2] },
  head: { paddingTop: space[2] },
  nav: { flexDirection: 'row' },
  grid: { marginTop: space[5], gap: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
});
