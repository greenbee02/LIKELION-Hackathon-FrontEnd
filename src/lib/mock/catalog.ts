import type { RecommendedProduct } from '../recommendations';

/**
 * 공식 컬렉션이 무엇으로 이루어지는가 — 목 모드용.
 *
 * 실서버에서는 이 정보가 `GET /product-collections/{id}/products` 로 오고
 * `fetchCollectionIndex()` 가 이미 받아둔다. 그런데 **목 모드에서는 아무도 그것을 부르지
 * 않는다** — `cards-store` 가 목 배열을 곧장 쓰기 때문에 색인이 만들어질 일이 없다. 그래서
 * 추천 화면이 목에서 성립하려면 "세트의 전체 목록"을 여기서 대신 갖고 있어야 한다.
 *
 * **키는 `mock/cards.ts` 의 `collection.id` 와 맞춰야 한다.** 어긋나면 추천이 조용히 비고,
 * 그건 오류로 보이지 않아서 찾기 어렵다.
 *
 * 각 세트에 이미 가진 상품도 함께 적는다. 차집합이 하는 일을 목에서도 똑같이 시험하려면
 * 빼야 할 것이 실제로 들어 있어야 한다.
 */
export const MOCK_CATALOG: Record<string, { name: string; products: RecommendedProduct[] }> = {
  'seoul-exclusive': {
    name: 'Seoul Exclusive',
    products: [
      /* c1 이 가진 것 — 차집합에서 빠져야 한다. */
      { id: 'p-trolley', name: 'Visetos Original Cabin Trolley', category: '트롤리', limited: true },
      { id: 'p-seoul-tote', name: 'Tracery Seoul Exclusive Tote', category: '쇼퍼백', limited: true },
      { id: 'p-seoul-charm', name: 'Seoul Night 가죽 참', category: '액세서리', limited: true },
    ],
  },
  'aw26-new': {
    name: '2026 New Arrivals',
    products: [
      /* c2 가 가진 것. */
      { id: 'p-drawstring', name: 'Dessau Drawstring Bag', category: '숄더백', limited: false },
      { id: 'p-sangria-scarf', name: 'Sangria Sunset 실크 스카프', category: '스카프', limited: false },
      { id: 'p-disco-cap', name: 'Disco Monogram 볼캡', category: '모자', limited: false },
    ],
  },
  'womens-signature': {
    name: "Women's Signature",
    products: [
      /* c3·c4 가 가진 것 둘. */
      { id: 'p-cardigan', name: 'Chevron Intarsia Wool Cardigan', category: '니트웨어', limited: false },
      { id: 'p-blazer', name: 'Bouclé Trim Wool Blazer', category: '아우터', limited: false },
      { id: 'p-pleat-skirt', name: 'Plissé 울 플리츠 스커트', category: '스커트', limited: false },
      { id: 'p-signature-pump', name: 'Signature 레더 펌프스', category: '신발', limited: false },
    ],
  },
};

/**
 * 목 카드가 어느 상품인지 잇는 다리.
 *
 * 실서버에서는 카드가 `product.id` 를 갖고 그 값이 카탈로그의 키와 같지만, `mock/cards.ts` 의
 * 상품 id 는 카탈로그와 따로 지어져 있었다. 목을 다시 짜서 맞추는 대신 여기 표를 둔다 —
 * 목 카드의 id 는 카드 아트 파일명과도 묶여 있어서 건드리면 그림이 함께 어긋난다.
 */
export const MOCK_CARD_PRODUCTS: Record<string, string> = {
  c1: 'p-trolley',
  c2: 'p-drawstring',
  c3: 'p-cardigan',
  c4: 'p-blazer',
};
