import { useRouter } from 'expo-router';
import { FolderOpen, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { CollectionRow } from '@/components/collection/collection-row';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { useCards } from '@/lib/cards-store';
import { useCollections } from '@/lib/collections-store';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 내 컬렉션 — 고객이 직접 묶은 것들의 목록.
 *
 * 컬렉션 탭이 "가진 카드 전부"를 보여주는 곳이라면 여기는 **그것을 어떻게 나눠 두었는지**를
 * 보는 곳이다. 그래서 이 화면은 탭이 아니라 탭의 메뉴 안쪽에 있다 — 폴더를 고르는 일은
 * 필터를 고르는 일이고, 그건 이미 그 메뉴가 하는 일이다. 여기는 그 폴더들을 **만들고 고치는**
 * 화면이라 한 겹 안쪽이 맞다.
 *
 * 만드는 방법이 둘이고, 둘의 무게가 다르다. 직접 고르는 쪽이 헤더의 `+` 이고, 카드에서
 * 묶음을 찾아주는 쪽은 목록 아래 한 칸이다. 후자가 아래인 이유는 그것이 제안일 뿐이기
 * 때문이다 — 무엇을 묶을지는 결국 고객이 정한다.
 */
export default function CollectionListScreen() {
  const { status, collections, error } = useCollections();
  const { cards } = useCards();
  const router = useRouter();

  const nav = (
    <NavBar
      title="내 컬렉션"
      fallback="/"
      action={{
        icon: Plus,
        onPress: () => router.push('/collection/new'),
        accessibilityLabel: '새 컬렉션 만들기',
      }}
    />
  );

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={FolderOpen}
          title="컬렉션을 불러오지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <View style={styles.list}>
          {['s1', 's2', 's3'].map((key) => (
            <Skeleton key={key} style={styles.rowSkeleton} />
          ))}
        </View>
      </Screen>
    );
  }

  if (collections.length === 0) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={FolderOpen}
          title="아직 만든 컬렉션이 없습니다"
          action={{ label: '새 컬렉션 만들기', onPress: () => router.push('/collection/new') }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}

      <View style={styles.list}>
        {collections.map((collection) => (
          <CollectionRow
            key={collection.id}
            collection={collection}
            /* 표지는 담긴 첫 카드다. 카드 본문은 `useCards()` 가 들고 있으므로 여기서 찾는다 —
               컬렉션이 카드를 따로 들고 있으면 발급 직후 한쪽만 갱신된다. */
            cover={cards.find((c) => c.id === collection.cardIds[0]) ?? null}
            onPress={() =>
              router.push({ pathname: '/collection/[id]', params: { id: collection.id } })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2] },
  /** 행 사이는 간격이 아니라 각자의 세로 여백이 만든다 — `CollectionRow` 가 12씩 갖고 있다. */
  list: { marginTop: space[4], ...allowPressOverflow },
  rowSkeleton: { height: 56, borderRadius: radius.base, marginVertical: space[3] },
});
