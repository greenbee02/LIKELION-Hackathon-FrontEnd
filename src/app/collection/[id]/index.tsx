import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { FolderOpen, Pencil } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardTile } from '@/components/card/card-tile';
import { CardTileSkeleton } from '@/components/card/card-tile-skeleton';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Sheet, useSheetSpace } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import { fetchCards } from '@/lib/api/cards';
import { fetchCollection } from '@/lib/api/collections';
import { failureCopy } from '@/lib/api/errors';
import { useCollections } from '@/lib/collections-store';
import { formatPurchaseDate } from '@/lib/format';
import type { Card, UserCollection } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

const COLUMNS = 2;

/**
 * 컬렉션 하나 — 담긴 카드가 화면의 전부다.
 *
 * 컬렉션 탭과 같은 2열 그리드를 쓴다. 같은 물건을 보는 두 화면이 서로 다른 격자를 쓰면 폴더에
 * 들어가는 일이 카드를 다른 것으로 바꾸는 일처럼 느껴진다.
 *
 * **설명과 만든 날은 시트 안이다.** 화면의 주제는 카드이고, 컬렉션에 대한 사실은 그 카드들에
 * 딸린 부수 정보다. 카드 상세가 제품 상세를 시트에 두는 것과 정확히 같은 나눔이다.
 *
 * 삭제는 시트 안 맨 아래의 텍스트 링크이고, 누르면 `Dialog` 가 한 번 더 묻는다. 되돌릴 수
 * 없는 유일한 조작이라 이 화면에서 `Dialog` 가 쓰이는 곳도 여기뿐이다. **카드는 지워지지
 * 않는다** — 사라지는 것은 묶음이므로, 그 사실을 물음말에 적는다.
 */
export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { remove } = useCollections();
  const router = useRouter();
  const toast = useToast();
  const bottomSpace = useSheetSpace();
  const [collection, setCollection] = useState<UserCollection | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const requestVersion = useRef(0);

  /* 상세 화면은 목록 캐시에 의존하지 않는다. 화면에 들어오거나 편집 화면에서 돌아올 때
     컬렉션 본문과 최신 카드 목록을 함께 다시 받아, 이름·설명·커버·카드 추가/삭제가 모두
     즉시 반영되도록 한다. */
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!id) {
      setStatus('error');
      setLoadError('컬렉션을 찾을 수 없습니다.');
      return;
    }
    setStatus('loading');
    setLoadError(null);
    try {
      const [nextCollection, latestCards] = await Promise.all([
        fetchCollection(id),
        fetchCards(),
      ]);
      if (version !== requestVersion.current) return;
      setCollection(nextCollection);
      setCards(latestCards);
      setStatus('ready');
    } catch (e) {
      if (version !== requestVersion.current) return;
      setStatus('error');
      setLoadError(failureCopy(e).note);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestVersion.current += 1;
      };
    }, [load]),
  );

  /* 이름이 여기 있으므로 본문에는 큰 제목이 없다 — 같은 말이 두 번 적히지 않는다.
     아직 못 불러온 동안에는 이름 자리가 빈다: 스켈레톤을 세우면 한 글자짜리 회색 막대가
     제목처럼 보이고, 그건 이름이 아니라 이름이 있을 자리라는 뜻이 되지 못한다. */
  const nav = (title: string, action?: Parameters<typeof NavBar>[0]['action']) => (
    <NavBar title={title} fallback="/collection" action={action} />
  );

  if (!collection) {
    if (status === 'loading') {
      return (
        <Screen contentContainerStyle={styles.head}>
          {nav('')}
          <View style={styles.grid}>
            {['s1', 's2'].map((key) => (
              <View key={key} style={styles.row}>
                <CardTileSkeleton />
                <CardTileSkeleton />
              </View>
            ))}
          </View>
        </Screen>
      );
    }
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav('컬렉션')}
        <EmptyState
          icon={FolderOpen}
          title="컬렉션을 찾을 수 없습니다"
          note={loadError ?? '삭제되었거나 잘못된 주소입니다.'}
          action={{ label: '내 컬렉션으로 가기', onPress: () => router.replace('/collection') }}
        />
      </Screen>
    );
  }

  /* 담긴 순서를 지킨다. `cards` 를 걸러내면 발급 순서로 정렬돼, 고객이 담은 순서와 달라진다. */
  const held = collection.cardIds
    .map((cardId) => cards.find((c) => c.id === cardId))
    .filter((c): c is Card => Boolean(c));

  const rows: (Card | null)[][] = [];
  for (let i = 0; i < held.length; i += COLUMNS) {
    const row: (Card | null)[] = held.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  const drop = () => {
    setConfirming(false);
    void (async () => {
      const ok = await remove(collection.id);
      if (!ok) return toast('컬렉션을 삭제하지 못했습니다.');
      router.replace('/collection');
    })();
  };

  return (
    <Screen gutter={false}>
      <ScrollView
        contentContainerStyle={[
          styles.gutter,
          allowPressOverflow,
          { paddingBottom: bottomSpace },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {nav(collection.name, {
          icon: Pencil,
          onPress: () =>
            router.push({ pathname: '/collection/[id]/edit', params: { id: collection.id } }),
          accessibilityLabel: '컬렉션 편집',
        })}

        {held.length === 0 ? (
          <View style={styles.emptyBox}>
            <EmptyState
              icon={FolderOpen}
              title="아직 담긴 카드가 없습니다"
              note={'편집에서 가진 카드를 골라\n이 컬렉션에 담아보세요.'}
              action={{
                label: '카드 담기',
                onPress: () =>
                  router.push({
                    pathname: '/collection/[id]/edit',
                    params: { id: collection.id },
                  }),
              }}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((row, rowIndex) => (
              <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
                {row.map((card, index) =>
                  card ? (
                    <CardTile
                      key={card.id}
                      card={card}
                      onPress={() =>
                        router.push({ pathname: '/card/[id]', params: { id: card.id } })
                      }
                    />
                  ) : (
                    <View key={`blank-${index}`} style={styles.blank} />
                  ),
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet title="컬렉션 정보">
        {collection.description ? (
          <Text variant="body" tone="muted" style={styles.info}>
            {collection.description}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted" style={styles.info}>
          {`${formatPurchaseDate(collection.createdAt)} 부터 · ${collection.cardCount}장`}
        </Text>
        <View style={styles.divider} />
        <TextLink label="컬렉션 삭제" tone="default" onPress={() => setConfirming(true)} />
      </Sheet>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="컬렉션 삭제"
        description={'이 묶음만 사라지고 카드는 그대로 남습니다.\n이 작업은 되돌릴 수 없습니다.'}
        confirmLabel="삭제하기"
        onConfirm={drop}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: space[4], paddingTop: space[2] },
  head: { paddingTop: space[2] },
  grid: { marginTop: space[5], gap: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
  emptyBox: { height: 300, marginTop: space[5] },
  info: { marginBottom: space[2] },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: space[2],
  },
});
