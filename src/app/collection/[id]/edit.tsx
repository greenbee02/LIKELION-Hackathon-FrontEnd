import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { CollectionEditor } from '@/components/collection/collection-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { useToast } from '@/components/ui/toast';
import { FolderOpen } from 'lucide-react-native';
import { useCards } from '@/lib/cards-store';
import { useCollection, useCollections } from '@/lib/collections-store';

/**
 * 컬렉션 고치기. 이름과 담긴 카드를 함께 저장한다.
 *
 * 이름 변경과 카드 편집이 한 화면인 이유는 고객이 둘을 하나로 여기기 때문이다 — "이 컬렉션을
 * 손본다"는 한 가지 일이지, 이름 짓기와 담기라는 두 가지 일이 아니다.
 */
export default function EditCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { collection, status } = useCollection(id);
  const { cards } = useCards();
  const { update, setCards } = useCollections();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  /* 아직 목록이 오지 않은 것과 없는 것은 다르다. 로딩 중에는 아무것도 단정하지 않는다 —
     편집기를 빈 값으로 그렸다가 데이터가 도착하면 입력란이 고객 손 밑에서 바뀐다. */
  if (!collection) {
    if (status === 'loading') return <Screen>{null}</Screen>;
    return (
      <Screen>
        <EmptyState
          icon={FolderOpen}
          title="컬렉션을 찾을 수 없습니다"
          note="삭제되었거나 잘못된 주소입니다."
          action={{ label: '내 컬렉션으로 가기', onPress: () => router.replace('/collection') }}
        />
      </Screen>
    );
  }

  const submit = (
    name: string,
    description: string,
    coverImageUrl: string | null,
    cardIds: string[],
  ) => {
    setPending(true);
    void (async () => {
      const ok = await update(collection.id, {
        name,
        description: description || null,
        coverImageUrl,
      });
      if (!ok) {
        setPending(false);
        toast('컬렉션을 저장하지 못했습니다.');
        return;
      }
      const synced = await setCards(collection.id, cardIds);
      if (!synced) {
        setPending(false);
        toast('컬렉션은 저장했지만 카드 목록을 동기화하지 못했습니다.');
        return;
      }
      router.back();
    })();
  };

  return (
    <CollectionEditor
      title="컬렉션 편집"
      cards={cards}
      initialName={collection.name}
      initialDescription={collection.description}
      initialCoverImageUrl={collection.coverImageUrl}
      initialCardIds={collection.cardIds}
      submitLabel="저장"
      pending={pending}
      onSubmit={submit}
    />
  );
}
