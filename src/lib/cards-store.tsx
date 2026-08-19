import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchCards } from './api/cards';
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

  const value = useMemo<CardsValue>(
    () => ({
      status,
      cards,
      rewards,
      error,
      addCard: (card) => setCards((prev) => [card, ...prev]),
      claim,
    }),
    [status, cards, rewards, error, claim],
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error('useCards must be used inside CardsProvider');
  return ctx;
}

export function useCard(id: string | undefined) {
  const { cards, status } = useCards();
  return { card: cards.find((c) => c.id === id) ?? null, status };
}

export function useReward(id: string | undefined) {
  const { rewards, status } = useCards();
  return { reward: rewards.find((r) => r.id === id) ?? null, status };
}
