import { fetchCollectionIndex } from './api/product-collections';
import { assetUrl, USE_MOCK } from './config';
import { categoryLabel } from './labels';
import { MOCK_CARD_PRODUCTS, MOCK_CATALOG } from './mock/catalog';
import type { Card } from './types';

/**
 * 아직 갖지 않은 카드.
 *
 * **추천 API 는 없지만 이것은 목이 아니다.** 공식 컬렉션이 무슨 상품으로 이루어지는지는
 * `GET /product-collections/{id}/products` 가 이미 알려주고 있고, 그 응답을
 * `fetchCollectionIndex()` 가 앱 수명 동안 한 번 받아 들고 있다. 거기서 보유 카드의 상품을
 * 빼면 남는 것이 곧 "아직 없는 것"이다. **왕복은 한 번도 늘지 않는다.**
 *
 * 지어낸 목보다 이쪽이 나은 이유는 숫자가 맞기 때문이다. 리워드 화면이 "앞으로 2장"이라고
 * 말할 때 그 2장이 무엇인지 이 목록이 답하는데, 두 화면이 서로 다른 출처를 보면 하나가 3장을
 * 말하고 다른 하나가 2장을 보여주는 일이 생긴다.
 */

export type RecommendedProduct = {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string | null;
  limited: boolean;
};

export type Recommendation = {
  product: RecommendedProduct;
  collection: { id: string; name: string };
  /** 이 세트를 채우는 데 반드시 필요한 상품인가. 리워드 달성률의 분모가 이것이다. */
  required: boolean;
  /** 이 세트에서 아직 없는 상품 수. 같은 세트의 추천은 모두 같은 값을 갖는다. */
  remaining: number;
};

/** 보유 카드가 가리키는 상품 id 의 집합. 목과 실서버가 id 를 다르게 짓기 때문에 갈린다. */
function ownedProductIds(cards: Card[]): Set<string> {
  if (USE_MOCK) {
    return new Set(cards.map((c) => MOCK_CARD_PRODUCTS[c.id]).filter(Boolean));
  }
  return new Set(cards.map((c) => c.product.id));
}

/**
 * 세트별로 훑어 없는 것만 남긴다.
 *
 * 정렬은 두 가지를 본다 — **필수인 것이 먼저**이고(그것이 리워드를 여는 조건이므로), 그다음은
 * **거의 다 모은 세트가 먼저**다. 한 장 남은 세트를 채우는 것이 다섯 장 남은 세트를 시작하는
 * 것보다 고객에게 가까운 목표다.
 */
export async function fetchRecommendations(cards: Card[]): Promise<Recommendation[]> {
  const owned = ownedProductIds(cards);
  const out: Recommendation[] = [];

  if (USE_MOCK) {
    for (const [id, set] of Object.entries(MOCK_CATALOG)) {
      const missing = set.products.filter((p) => !owned.has(p.id));
      for (const product of missing) {
        out.push({
          product,
          collection: { id, name: set.name },
          required: true,
          remaining: missing.length,
        });
      }
    }
  } else {
    const index = await fetchCollectionIndex();
    for (const [id, items] of index.byCollection) {
      const collection = index.byId.get(id);
      if (!collection) continue;
      const missing = items.filter((item) => !owned.has(item.product.id));
      for (const item of missing) {
        out.push({
          product: {
            id: item.product.id,
            name: item.product.name,
            category: categoryLabel(item.product.category),
            imageUrl: assetUrl(item.product.imageUrl),
            limited: item.product.limited,
          },
          collection: { id, name: collection.name },
          required: item.required,
          remaining: missing.length,
        });
      }
    }
  }

  return out.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    if (a.remaining !== b.remaining) return a.remaining - b.remaining;
    return a.collection.name.localeCompare(b.collection.name);
  });
}
