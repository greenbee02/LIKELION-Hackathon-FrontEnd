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
import { failureCopy } from './api/errors';
import { useAuth } from './auth-store';
import { claimReward } from './api/rewards';
import { fetchRewards } from './rewards';
import type { Card, Reward } from './types';

/**
 * The seam between screens and the network.
 *
 * Every screen reads `status` and branches three ways — loading, empty, loaded — because that is
 * the contract in AGENTS.md, and because a screen that only handles the happy path has to be
 * rewritten the first time the list comes back empty. Everything here is the live backend —
 * there is no mock path any more, so a screen that renders is a screen the server answered.
 */

type Status = 'loading' | 'ready' | 'error';

type CardsValue = {
  status: Status;
  cards: Card[];
  rewards: Reward[];
  error: string | null;
  reload: () => void;
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
  const [epoch, setEpoch] = useState(0);
  /**
   * **누구인지 정해지기 전에는 아무것도 부르지 않는다.**
   *
   * 이 Provider 는 세션 게이트 바깥에 있어서 앱이 뜨는 순간 마운트된다. 토큰은 기기에서
   * 읽어오므로 그 순간에는 아직 전송 계층에 꽂혀 있지 않고, 그대로 요청을 보내면 헤더 없는
   * 요청이 나가 401 을 받는다. 그 401 은 **세션을 끊지도 않는다** — `client.ts` 가 토큰을
   * 실어 보낸 401 만 만료로 치기 때문이고, 그건 로그인 실패의 401 로 세션을 끊지 않으려는
   * 올바른 판단이다. 그래서 증상은 로그인된 채로 목록만 `HTTP 401` 로 굳는 것이 된다.
   *
   * 목에서는 네트워크를 안 타니 보이지 않던 문제다.
   */
  const { status: authStatus } = useAuth();

  const signedIn = authStatus === 'signed-in';

  useEffect(() => {
    if (!signedIn) return;

    let alive = true;
    const load = async () => {
      setError(null);
      setStatus('loading');
      try {
        // 카드와 리워드는 서로를 기다리지 않는다. 리워드 쪽이 컬렉션 색인까지 만드느라 더
        // 오래 걸리는데, 그것 때문에 카드 그리드가 늦게 뜰 이유가 없다.
        const [live, earned] = await Promise.all([fetchCards(), fetchRewards()]);
        if (!alive) return;
        setCards(live);
        setRewards(earned);
        if (alive) setStatus('ready');
      } catch (e) {
        if (!alive) return;
        /* 서버의 원문이 아니라 우리 문장이다 — `e.message` 는 `HTTP 500` 같은 값일 수
           있고, 그것을 빈 화면의 설명으로 내보내는 것은 아무 말도 안 하는 것보다 나쁘다. */
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

  /**
   * 코드를 발급받고, 돌아온 값을 그 리워드에 얹는다.
   *
   * `CANCELLED` 만 얹지 않는다. 그건 브랜드가 리워드를 거둬들였다는 뜻이라 수령의 결과로
   * 볼 것이 아니고, 목록에서 아예 빠지는 값이다(`rewards.ts`).
   */
  const claim = useCallback<CardsValue['claim']>(async (reward) => {
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
        const found = await fetchCard(id);
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

  /* 로그아웃한 뒤에도 state 에는 앞사람의 카드가 남아 있다. 지우는 대신 내보내지 않는다 —
     이펙트 본문에서 setState 로 되돌리면 렌더가 한 바퀴 더 돌고, 그 한 프레임 동안 앞사람의
     목록이 그대로 보인다. 다음 로그인이 이펙트를 다시 돌려 진짜 값을 채운다. */
  const value = useMemo<CardsValue>(
    () => ({
      status: signedIn ? status : 'loading',
      cards: signedIn ? cards : [],
      rewards: signedIn ? rewards : [],
      error: signedIn ? error : null,
      reload,
      addCard: (card) => setCards((prev) => [card, ...prev]),
      loadCard,
      claim,
    }),
    [signedIn, status, cards, rewards, error, reload, loadCard, claim],
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

  /* **어느 카드가 없다고 판정됐는지까지 기억한다.** 불리언 하나면 그 판정이 다음 카드까지
     따라가서, 없는 카드를 한 번 연 뒤에는 멀쩡한 카드도 영영 오류로 보인다 — 같은 컴포넌트가
     id 만 바꿔 다시 쓰이는 것이 라우터에서는 평범한 일이다. */
  const [goneId, setGoneId] = useState<string | null>(null);
  const gone = Boolean(id) && goneId === id;

  useEffect(() => {
    if (!missing || !id) return;
    let alive = true;
    void loadCard(id).then((found) => {
      if (alive && !found) setGoneId(id);
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
