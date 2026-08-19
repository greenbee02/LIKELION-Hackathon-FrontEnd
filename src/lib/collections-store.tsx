import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  addCardToCollection,
  createCollection,
  deleteCollection,
  fetchCollections,
  removeCardFromCollection,
  updateCollection,
  type CollectionInput,
} from './api/collections';
import { USE_MOCK } from './config';
import {
  mockAddCard,
  mockCreateCollection,
  mockDeleteCollection,
  mockFetchCollections,
  mockRemoveCard,
  mockUpdateCollection,
} from './mock/collections';
import type { UserCollection } from './types';

/**
 * 개인 컬렉션이 사는 곳.
 *
 * `cards-store` 와 같은 모양이되 **쓰기가 있다는 점이 다르다.** 그리고 그 쓰기의 결과를 네
 * 화면이 동시에 봐야 한다 — 컬렉션 탭의 필터 드롭다운, 목록, 편집, 상세. 화면마다 따로
 * 불러오면 하나에서 만든 컬렉션이 다른 하나에는 없다.
 *
 * **카드 본문은 여기 없다.** 컬렉션은 어느 카드가 들어 있는지(`cardIds`)만 알고, 그 카드가
 * 무엇인지는 `useCards()` 가 안다. 두 곳이 같은 카드를 각자 들고 있으면 발급 직후 한쪽만
 * 갱신되는 상태가 생긴다.
 */

type Status = 'loading' | 'ready' | 'error';

type CollectionsValue = {
  status: Status;
  collections: UserCollection[];
  error: string | null;
  create: (input: CollectionInput) => Promise<UserCollection | null>;
  rename: (id: string, name: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  /**
   * 담긴 카드를 통째로 이 목록으로 맞춘다.
   *
   * 편집 화면은 "무엇을 담을지"를 최종 상태로 들고 있지 백엔드가 요구하는 추가·제거의
   * 나열로 들고 있지 않다. 차이를 계산하는 일은 여기서 한 번만 하면 되고, 화면마다 하면
   * 화면마다 틀린다.
   */
  setCards: (id: string, cardIds: string[]) => Promise<boolean>;
  reload: () => void;
};

const CollectionsContext = createContext<CollectionsValue | null>(null);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        // 목에도 지연을 준다. 나타나지 않는 스켈레톤은 시험된 적 없는 스켈레톤이다.
        if (USE_MOCK) await new Promise((r) => setTimeout(r, 700));
        const list = USE_MOCK ? mockFetchCollections() : await fetchCollections();
        if (!alive) return;
        setCollections(list);
        setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '컬렉션을 불러오지 못했습니다.');
        setStatus('error');
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [epoch]);

  const reload = useCallback(() => setEpoch((n) => n + 1), []);

  const create = useCallback<CollectionsValue['create']>(async (input) => {
    try {
      const made = USE_MOCK ? mockCreateCollection(input) : await createCollection(input);
      setCollections((prev) => [made, ...prev]);
      return made;
    } catch {
      return null;
    }
  }, []);

  const rename = useCallback<CollectionsValue['rename']>(async (id, name) => {
    try {
      const next = USE_MOCK
        ? mockUpdateCollection(id, { name })
        : await updateCollection(id, { name });
      setCollections((prev) => prev.map((c) => (c.id === id ? next : c)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const remove = useCallback<CollectionsValue['remove']>(async (id) => {
    try {
      if (USE_MOCK) mockDeleteCollection(id);
      else await deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  const setCards = useCallback<CollectionsValue['setCards']>(async (id, cardIds) => {
    try {
      setCollections((prev) => {
        const current = prev.find((c) => c.id === id);
        if (!current) return prev;
        const added = cardIds.filter((c) => !current.cardIds.includes(c));
        const removed = current.cardIds.filter((c) => !cardIds.includes(c));

        /* 요청은 화면 갱신을 기다리지 않는다. 카드 한 장을 담는 데 왕복이 하나씩 필요한
           API 라, 열 장을 고른 편집은 열 번의 왕복이고 그동안 화면이 멈춰 있을 이유가 없다.
           실패하면 아래 catch 가 아니라 `reload()` 가 진실을 되찾는다. */
        void (async () => {
          try {
            for (const cardId of added) {
              if (USE_MOCK) mockAddCard(id, cardId);
              else await addCardToCollection(id, cardId);
            }
            for (const cardId of removed) {
              if (USE_MOCK) mockRemoveCard(id, cardId);
              else await removeCardFromCollection(id, cardId);
            }
          } catch {
            reload();
          }
        })();

        return prev.map((c) =>
          c.id === id ? { ...c, cardIds, cardCount: cardIds.length } : c,
        );
      });
      return true;
    } catch {
      return false;
    }
  }, [reload]);

  const value = useMemo<CollectionsValue>(
    () => ({ status, collections, error, create, rename, remove, setCards, reload }),
    [status, collections, error, create, rename, remove, setCards, reload],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useCollections(): CollectionsValue {
  const value = useContext(CollectionsContext);
  if (!value) throw new Error('useCollections must be used inside CollectionsProvider');
  return value;
}

/** 컬렉션 한 개. 목록에서 찾는다 — 상세 화면이 자기 것만 따로 부르면 두 벌이 된다. */
export function useCollection(id: string | undefined) {
  const { collections, status } = useCollections();
  return { collection: collections.find((c) => c.id === id) ?? null, status };
}
