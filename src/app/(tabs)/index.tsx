import { useRouter } from 'expo-router';
import { ChevronDown, Layers, QrCode } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { CardTile } from '@/components/card/card-tile';
import { CardTileSkeleton } from '@/components/card/card-tile-skeleton';
import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { Dropdown } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useCards } from '@/lib/cards-store';
import { ALL_FILTER, collectionFilters, type CollectionFilter } from '@/lib/collection-filters';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/** Two columns: enough of the collection on screen at once that it reads as one. */
const COLUMNS = 2;

/** One screenful of placeholders, so the grid does not grow under the customer as data lands. */
const SKELETON_KEYS = ['s1', 's2', 's3', 's4'];

/**
 * 내 컬렉션 — the archive.
 *
 * Not a purchase history: the cards are the subject and everything else is chrome, which is why
 * the header scrolls away with them rather than pinning to the top.
 *
 * The filter is the screen's title. A row of chips under it would have spent a whole band of the
 * screen restating what one line already says, and it gets worse with every filter added; a menu
 * costs one tap and stays the same size at two entries or twenty. The title reads as what you are
 * currently looking at — `내 컬렉션` for everything, `한정판` or a city when narrowed — so the
 * screen never has to say "filtered by" anywhere.
 *
 * Which filters exist is `collectionFilters`' problem, and it works them out from the cards. That
 * is why this file has no list of them.
 */
export default function CollectionScreen() {
  const { status, cards, error } = useCards();
  const [filterId, setFilterId] = useState<string>(ALL_FILTER);
  const router = useRouter();
  /* The tab bar floats over this list, so the last row has to buy its own clearance. */
  const bottomSpace = useTabBarSpace();
  const goScan = () => router.push('/scan');
  const openCard = (card: Card) =>
    router.push({ pathname: '/card/[id]', params: { id: card.id } });

  const filters = useMemo(() => collectionFilters(cards), [cards]);
  const current = filters.find((f) => f.value === filterId) ?? filters[0];

  const visible = useMemo<Card[]>(() => cards.filter(current.match), [cards, current]);

  /* A tile is `flex: 1`, so an odd last row would let one card take the whole width and stop
     looking like a card. The row is filled with a blank of the same flex instead. */
  const grid = useMemo<(Card | null)[]>(() => {
    const items: (Card | null)[] = [...visible];
    while (items.length % COLUMNS !== 0) items.push(null);
    return items;
  }, [visible]);

  const header = (
    <Header filters={filters} current={current} onFilterChange={setFilterId} onScan={goScan} />
  );

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <EmptyState
          icon={Layers}
          title="컬렉션을 불러오지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen gutter={false}>
        {/* The same list, laid out by the same styles — anything else lets the grid shift on load. */}
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, { paddingBottom: bottomSpace }]}
          scrollEnabled={false}
          ListHeaderComponent={header}
          renderItem={() => <CardTileSkeleton />}
        />
      </Screen>
    );
  }

  if (cards.length === 0) {
    return (
      <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
        {header}
        <EmptyState
          icon={Layers}
          title="아직 카드가 없습니다"
          note={'구매 후 영수증의 QR을 스캔하면\n첫 카드가 발급됩니다.'}
          action={{ label: '카드 발급받기', onPress: goScan }}
        />
      </Screen>
    );
  }

  return (
    <Screen gutter={false}>
      <FlatList
        data={grid}
        keyExtractor={(card, index) => card?.id ?? `blank-${index}`}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.grid, { paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          item ? (
            <CardTile card={item} onPress={() => openCard(item)} />
          ) : (
            <View style={styles.blank} />
          )
        }
      />
    </Screen>
  );
}

/**
 * The title is the filter.
 *
 * No count beside it. The number of cards is visible as the cards themselves, and a header that
 * states it too is the screen explaining what the reader is already looking at. The counts stay
 * in the menu, where they are a reason to pick one row over another rather than a statistic
 * bolted to a title.
 *
 * When the collection is too uniform to divide there is nothing to choose, so the chevron and the
 * menu disappear and the title goes back to being a title. A control that opens a list of one is
 * a lie about how much is here.
 */
function Header({
  filters,
  current,
  onFilterChange,
  onScan,
}: {
  filters: CollectionFilter[];
  current: CollectionFilter;
  onFilterChange: (value: string) => void;
  onScan: () => void;
}) {
  /* One entry is 전체 alone — a menu with nothing to decide, so no chevron either. */
  const filterable = filters.length > 1;

  const title = (
    <View style={styles.title}>
      <Text variant="title">{current.title}</Text>
      {filterable ? <ChevronDown size={20} color={colors.text} style={styles.chevron} /> : null}
    </View>
  );

  return (
    <View style={styles.header}>
      {filterable ? (
        <Dropdown
          value={current.value}
          onValueChange={onFilterChange}
          options={filters}
          accessibilityLabel="컬렉션 필터"
        >
          {title}
        </Dropdown>
      ) : (
        title
      )}
      {/* The way a card gets here, kept where the eye already is rather than a tab away. */}
      <IconButton icon={QrCode} onPress={onScan} variant="glass" accessibilityLabel="QR 스캔" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[2],
    ...allowPressOverflow,
  },
  title: { flexDirection: 'row', alignItems: 'center', ...allowPressOverflow },
  chevron: { marginLeft: space[1] },
  /** Holds a column open in an odd last row. Nothing in it, so nothing to see. */
  blank: { flex: 1 },
  /* The screen's 16pt gutter, carried by the list's content rather than by the screen around it.
     A scroll view clips at its own edge on the web, so a card sitting flush against that edge has
     nowhere to grow — put the gutter inside and the card grows into padding instead of past a
     boundary. `Screen gutter={false}` exists for exactly this. */
  grid: { paddingHorizontal: space[4], ...allowPressOverflow },
  /** 12 between columns, 24 between rows: cards in a row are one shelf, rows are separate shelves. */
  row: { gap: space[3], marginTop: space[5], ...allowPressOverflow },
});
