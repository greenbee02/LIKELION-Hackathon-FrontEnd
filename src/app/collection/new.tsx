import { useRouter } from 'expo-router';
import { useState } from 'react';

import { CollectionEditor } from '@/components/collection/collection-editor';
import { useToast } from '@/components/ui/toast';
import { useCards } from '@/lib/cards-store';
import { useCollections } from '@/lib/collections-store';

/**
 * 새 컬렉션. `CollectionEditor` 를 감싸 만들기 쪽 결말만 담당한다.
 *
 * 만들고 나면 목록이 아니라 **만든 것 안으로** 들어간다. 방금 이름 붙인 것을 바로 보는 편이
 * 목록에서 한 번 더 찾게 하는 것보다 낫고, `replace` 라 뒤로 가기가 빈 편집 화면으로 돌아오지
 * 않는다.
 */
export default function NewCollectionScreen() {
  const { cards } = useCards();
  const { create, setCards } = useCollections();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const submit = (name: string, cardIds: string[]) => {
    setPending(true);
    void (async () => {
      const made = await create({ name });
      if (!made) {
        setPending(false);
        toast('컬렉션을 만들지 못했습니다.');
        return;
      }
      if (cardIds.length > 0) await setCards(made.id, cardIds);
      router.replace({ pathname: '/collection/[id]', params: { id: made.id } });
    })();
  };

  return (
    <CollectionEditor
      title="새 컬렉션"
      cards={cards}
      submitLabel="만들기"
      pending={pending}
      onSubmit={submit}
    />
  );
}
