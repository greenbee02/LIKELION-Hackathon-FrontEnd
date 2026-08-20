import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { failureCopy } from './api/errors';
import { useAuth } from './auth-store';
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
  /* 카드 쪽과 같은 이유로 세션을 기다린다 — `cards-store` 의 같은 자리 주석 참고. */
  const { status: authStatus } = useAuth();

  const signedIn = authStatus === 'signed-in';

  useEffect(() => {
    if (!signedIn) return;

    let alive = true;
    const load = async () => {
      setStatus('loading');
      try {
        const list = await fetchCollections();
        if (!alive) return;
        setCollections(list);
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
  }, [epoch, signedIn]);

  const reload = useCallback(() => setEpoch((n) => n + 1), []);

  /* `setCards` 가 지금의 목록을 읽는 창구. 상태를 의존성으로 받으면 목록이 바뀔 때마다
     함수가 새로 만들어지고, 그것을 `useEffect` 에 걸어둔 화면이 같이 다시 돈다.
     갱신은 렌더 중이 아니라 이펙트에서 한다 — 렌더는 여러 번 버려질 수 있고, 버려진 렌더가
     ref 에 남긴 값은 아무도 되돌리지 않는다. 이펙트는 고객이 무엇을 누르기 전에 흐른다. */
  const latest = useRef(collections);
  useEffect(() => {
    latest.current = collections;
  }, [collections]);

  const create = useCallback<CollectionsValue['create']>(async (input) => {
    try {
      const made = await createCollection(input);
      setCollections((prev) => [made, ...prev]);
      return made;
    } catch {
      return null;
    }
  }, []);

  const rename = useCallback<CollectionsValue['rename']>(async (id, name) => {
    try {
      const next = await updateCollection(id, { name });
      setCollections((prev) => prev.map((c) => (c.id === id ? next : c)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const remove = useCallback<CollectionsValue['remove']>(async (id) => {
    try {
      await deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * 담긴 카드를 통째로 이 목록으로 맞춘다.
   *
   * **차이 계산과 요청이 `setState` 바깥에 있는 것이 핵심이다.** 예전에는 둘 다 갱신 함수
   * 안에 있었는데, React 는 갱신 함수를 순수하다고 보고 개발 모드에서 두 번 부른다 — 카드
   * 하나를 담는 데 `POST` 가 두 번 나가고, 그중 하나는 이미 담긴 카드를 다시 담는 요청이
   * 되어 서버가 409 로 답한다. 지금은 최신 목록을 ref 에서 읽어 한 번만 계산한다.
   *
   * **모르는 컬렉션은 빈 것으로 친다.** 방금 만든 컬렉션이 정확히 그 경우다 — `create` 가
   * 상태에 넣은 직후 `/collection/new` 가 곧바로 이 함수를 부르는데, ref 는 이펙트가 흐른
   * 뒤에야 그것을 안다. 없다고 돌아서면 새 컬렉션에 고른 카드가 조용히 사라지고, 빈 것으로
   * 치면 고른 것 전부가 추가로 계산되어 정확히 맞는다.
   */
  const setCards = useCallback<CollectionsValue['setCards']>(
    async (id, cardIds) => {
      const held = latest.current.find((c) => c.id === id)?.cardIds ?? [];

      const added = cardIds.filter((c) => !held.includes(c));
      const removed = held.filter((c) => !cardIds.includes(c));

      /* 화면은 기다리지 않는다. 카드 한 장을 담는 데 왕복이 하나씩 필요한 API 라, 열 장을
         고른 편집은 열 번의 왕복이고 그동안 화면이 멈춰 있을 이유가 없다. 실패하면
         `reload()` 가 진실을 되찾는다. */
      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, cardIds, cardCount: cardIds.length } : c)),
      );

      void (async () => {
        try {
          for (const cardId of added) await addCardToCollection(id, cardId);
          for (const cardId of removed) await removeCardFromCollection(id, cardId);
        } catch {
          reload();
        }
      })();

      return true;
    },
    [reload],
  );

  /* 카드 쪽과 같다 — 로그아웃한 뒤의 목록은 지우는 것이 아니라 내보내지 않는 것으로 감춘다. */
  const value = useMemo<CollectionsValue>(
    () => ({
      status: signedIn ? status : 'loading',
      collections: signedIn ? collections : [],
      error: signedIn ? error : null,
      create,
      rename,
      remove,
      setCards,
      reload,
    }),
    [signedIn, status, collections, error, create, rename, remove, setCards, reload],
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
