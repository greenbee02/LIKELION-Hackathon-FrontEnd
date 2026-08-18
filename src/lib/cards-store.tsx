import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MOCK_CARDS, MOCK_REWARDS } from './mock/cards';
import type { Card, Reward } from './types';

/**
 * The seam between screens and the network.
 *
 * Every screen reads `status` and branches three ways — loading, empty, loaded — because that is
 * the contract in AGENTS.md, and because a screen that only handles the happy path has to be
 * rewritten the first time the list comes back empty. `USE_MOCK` flips the whole app to live data
 * once `GET /cards` returns `brand`; nothing above this file changes.
 */
const USE_MOCK = true;

type Status = 'loading' | 'ready' | 'error';

type CardsValue = {
  status: Status;
  cards: Card[];
  rewards: Reward[];
  error: string | null;
  addCard: (card: Card) => void;
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
        }
        if (alive) setStatus('ready');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Something went wrong');
        setStatus('error');
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CardsValue>(
    () => ({
      status,
      cards,
      rewards,
      error,
      addCard: (card) => setCards((prev) => [card, ...prev]),
    }),
    [status, cards, rewards, error],
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
