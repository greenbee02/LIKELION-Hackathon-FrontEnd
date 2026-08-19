import type { Card } from './types';

/**
 * 가진 카드에서 묶을 거리를 찾는다.
 *
 * **이것은 AI 가 아니고, 화면도 그렇게 부르지 않는다.** 백엔드의 AI 분석·추천 도메인은 아직
 * 엔드포인트가 하나도 없고, 여기서 하는 일은 도시·하우스·시즌·세트로 카드를 묶어 두 장
 * 이상인 묶음만 남기는 것이다. 규칙을 AI 라고 부르기 시작하면 **정말로 AI 인 카드 디자인
 * 생성까지 같은 말이 되어 둘 다 신뢰를 잃는다.** 이 저장소가 "값 없는 행은 그리지 않는다"를
 * 열 번 반복하는 것과 같은 이유다 — 없는 능력을 이름으로 주장하지 않는다.
 *
 * 대신 근거를 말한다. 제안마다 왜 묶였는지가 붙고, 그 문장은 실제로 참이다.
 */

export type CollectionSuggestion = {
  key: string;
  name: string;
  /** 왜 이 묶음인지. 화면이 제목 아래 그대로 적는다. */
  reason: string;
  cardIds: string[];
};

/** 두 장 미만은 묶음이 아니다. 한 장짜리 컬렉션은 카드 한 장을 다르게 부르는 일일 뿐이다. */
const MIN = 2;

/** 진짜 계산은 눈 깜빡할 새다. 그래도 스켈레톤이 한 번은 보여야 그것이 시험된 적 있는
 *  스켈레톤이 된다 — `cards-store` 의 900ms 와 같은 급으로 둔다. */
const SUGGEST_MS = 1200;

type Bucket = { name: string; reason: string; cards: Card[] };

function collect(cards: Card[]): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();

  const push = (key: string, name: string, reason: string, card: Card) => {
    const found = buckets.get(key);
    if (found) found.cards.push(card);
    else buckets.set(key, { name, reason, cards: [card] });
  };

  for (const card of cards) {
    push(`city:${card.store.city}`, card.store.city, '같은 도시에서 만난 카드들', card);
    push(`brand:${card.brand.id}`, card.brand.name, '같은 하우스의 카드들', card);

    if (card.product.season) {
      push(
        `season:${card.product.season}`,
        card.product.season,
        '같은 시즌의 카드들',
        card,
      );
    }
    if (card.product.collection) {
      push(
        `set:${card.product.collection.id}`,
        card.product.collection.name,
        '하우스가 묶어둔 세트',
        card,
      );
    }
    if (card.product.limited) {
      push('limited', '한정판', '한정으로 나온 카드들', card);
    }
  }

  return buckets;
}

export async function suggestCollections(cards: Card[]): Promise<CollectionSuggestion[]> {
  await new Promise((r) => setTimeout(r, SUGGEST_MS));

  const buckets = [...collect(cards).entries()]
    .filter(([, bucket]) => bucket.cards.length >= MIN)
    /* 가진 카드 전부를 담는 묶음은 나누지 않은 것과 같다 — 그런 제안은 컬렉션이 아니라
       컬렉션 탭의 다른 이름이다. */
    .filter(([, bucket]) => bucket.cards.length < cards.length);

  /* 큰 묶음이 먼저. 많이 묶이는 축이 그 사람의 수집 방식에 더 가깝다. */
  buckets.sort((a, b) => b[1].cards.length - a[1].cards.length);

  return buckets.map(([key, bucket]) => ({
    key,
    name: bucket.name,
    reason: `${bucket.reason} · ${bucket.cards.length}장`,
    cardIds: bucket.cards.map((c) => c.id),
  }));
}
