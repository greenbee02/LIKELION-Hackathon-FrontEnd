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

import { fetchCard, fetchCards } from './api/cards';
import { claimReward } from './api/rewards';
import { USE_MOCK } from './config';
import { MOCK_CARDS } from './mock/cards';
import { MOCK_REWARDS } from './mock/rewards';
import { fetchRewards } from './rewards';
import type { Card, Reward } from './types';

/**
 * The seam between screens and the network.
 *
 * Every screen reads `status` and branches three ways — loading, empty, loaded — because that is
 * the contract in AGENTS.md, and because a screen that only handles the happy path has to be
 * rewritten the first time the list comes back empty. `EXPO_PUBLIC_USE_MOCK` flips the whole app
 * between mock and live; nothing above this file changes.
 */

type Status = 'loading' | 'ready' | 'error';

type CardsValue = {
  status: Status;
  cards: Card[];
  rewards: Reward[];
  error: string | null;
  addCard: (card: Card) => void;
  /**
   * 카드 한 장을 서버에서 다시 받아 목록에 반영한다.
   *
   * 두 가지 일을 한다. **딥링크** — `/card/{id}` 로 콜드 스타트한 고객의 카드는 목록에 없다.
   * **저장 후 갱신** — 꾸미기·이전 디자인 적용·원본 복원은 그 카드 하나만 바꾸므로, 목록
   * 전체를 다시 받는 것은 같은 답을 카드 수만큼 사는 일이다.
   *
   * 같은 id 로 동시에 여러 번 불려도 왕복은 한 번이다 — 저장 직후 편집기가 부르고, 되돌아간
   * 상세 화면이 딥링크로 판단해 또 부르는 일이 실제로 일어난다.
   */
  loadCard: (id: string) => Promise<Card | null>;
  /**
   * 수령 코드를 발급받는다. 조회가 아니라 생성이라 store 를 거친다 — 발급된 코드는 그 리워드의
   * 상태이므로, 화면이 혼자 들고 있으면 목록으로 돌아갔을 때 사라진다.
   */
  claim: (reward: Reward) => Promise<boolean>;
};

const CardsContext = createContext<CardsValue | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [cards, setCards] = useState<Card[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (USE_MOCK) {
          // A real fetch is not instant, and a skeleton that never shows is a skeleton never tested.
          await new Promise((r) => setTimeout(r, 900));
          if (!alive) return;
          setCards(MOCK_CARDS);
          setRewards(MOCK_REWARDS);
        } else {
          // 카드와 리워드는 서로를 기다리지 않는다. 리워드 쪽이 컬렉션 색인까지 만드느라 더
          // 오래 걸리는데, 그것 때문에 카드 그리드가 늦게 뜰 이유가 없다.
          const [live, earned] = await Promise.all([fetchCards(), fetchRewards()]);
          if (!alive) return;
          setCards(live);
          setRewards(earned);
        }
        if (alive) setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
        setStatus('error');
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 코드를 발급받고, 돌아온 값을 그 리워드에 얹는다.
   *
   * 목에서는 이미 코드가 박혀 있으므로 아무것도 하지 않고 성공만 알린다 — 목이 실서버보다
   * 관대한 것은 상관없지만, 목에만 있는 동작을 만들어내면 화면이 그것에 기대게 된다.
   */
  const claim = useCallback<CardsValue['claim']>(async (reward) => {
    if (USE_MOCK) return true;
    if (!reward.userRewardId) return false;
    try {
      const row = await claimReward(reward.userRewardId);
      setRewards((prev) =>
        prev.map((r) =>
          r.id === reward.id
            ? {
                ...r,
                claimCode: row.claimCode ?? r.claimCode,
                status: row.status === 'CANCELLED' ? r.status : row.status,
              }
            : r,
        ),
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  /** 진행 중인 단건 조회. 같은 카드를 두 화면이 동시에 물으면 왕복이 하나로 접힌다. */
  const inflight = useRef(new Map<string, Promise<Card | null>>());

  const loadCard = useCallback<CardsValue['loadCard']>((id) => {
    const running = inflight.current.get(id);
    if (running) return running;

    const task = (async () => {
      try {
        const found = USE_MOCK
          ? (MOCK_CARDS.find((c) => c.id === id) ?? null)
          : await fetchCard(id);
        if (found) {
          setCards((prev) => {
            const at = prev.findIndex((c) => c.id === found.id);
            if (at < 0) return [found, ...prev];
            const next = [...prev];
            next[at] = found;
            return next;
          });
        }
        return found;
      } catch {
        /* 실패는 조용히 `null` 이다. 부르는 쪽은 "없는 카드"와 "못 불러온 카드"를 같은 빈
           상태로 그리므로, 여기서 던지면 그 하나를 두 번 다루게 된다. */
        return null;
      } finally {
        inflight.current.delete(id);
      }
    })();

    inflight.current.set(id, task);
    return task;
  }, []);

  const value = useMemo<CardsValue>(
    () => ({
      status,
      cards,
      rewards,
      error,
      addCard: (card) => setCards((prev) => [card, ...prev]),
      loadCard,
      claim,
    }),
    [status, cards, rewards, error, loadCard, claim],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error('useCards must be used inside CardsProvider');
  return ctx;
}

/**
 * 카드 한 장. **목록에 없으면 가서 가져온다.**
 *
 * 이전에는 메모리 목록에서 `find` 하는 것이 전부라, `/card/{id}` 로 바로 들어온 고객은 목록이
 * 다 로드된 뒤에도 카드를 못 찾으면 그대로 빈 화면이었다 — 공유 링크가 열리지 않는다는 뜻이다.
 * 이제 목록이 정착한 뒤에도 없으면 그때 한 번 단건으로 부른다.
 *
 * 상태는 여전히 세 가지로 읽힌다: `'loading'` 동안 스켈레톤, 카드가 있으면 화면, 끝내 없으면
 * 빈 상태. 서버에 없는 것과 내 것이 아닌 것과 못 불러온 것은 고객이 할 일이 같으므로 나누지
 * 않는다.
 */
export function useCard(id: string | undefined) {
  const { cards, status, loadCard } = useCards();
  const card = cards.find((c) => c.id === id) ?? null;

  /* 목록이 오는 중이면 기다린다 — 로딩 중에 단건을 부르면 같은 카드를 두 번 받는다. */
  const missing = Boolean(id) && !card && status === 'ready';
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!missing || !id) return;
    let alive = true;
    void loadCard(id).then((found) => {
      if (alive && !found) setGone(true);
    });
    return () => {
      alive = false;
    };
  }, [missing, id, loadCard]);

  const resolved: Status = card ? 'ready' : status === 'error' || gone ? 'error' : 'loading';
  return { card, status: resolved };
}

export function useReward(id: string | undefined) {
  const { rewards, status } = useCards();
  return { reward: rewards.find((r) => r.id === id) ?? null, status };
}
