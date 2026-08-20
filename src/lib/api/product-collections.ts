import type { ProductResponse } from './products';
import { request } from './client';
import type { ProductCollection } from '../types';

/**
 * 공식 컬렉션 — 하우스가 묶은 세트지, 고객이 만든 폴더가 아니다.
 *
 * 카드 상세의 시트 첫 줄이자 리워드가 세어지는 단위(`collection_rewards.required_percentage`)라,
 * 이 한 줄이 카드 화면과 리워드 화면을 잇는 실이다.
 *
 * **문제는 상품이 자기가 어느 컬렉션에 속하는지 모른다는 것이다.** `ProductResponse` 에는
 * 컬렉션이 없고, 관계는 `product_collection_items` 에만 있으며 API 는 그것을 컬렉션 쪽에서만
 * 열어준다. 그래서 방향을 뒤집는다 — 컬렉션을 전부 훑어 상품→컬렉션 색인을 한 번 만든다.
 * 시드 기준 컬렉션 5개이므로 왕복 6번이고, 앱이 사는 동안 한 번뿐이다.
 */

export type ProductCollectionResponse = {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  description: string | null;
  theme: string | null;
  productionYear: number | null;
  season: string | null;
  region: string | null;
  limited: boolean;
  coverImageUrl: string | null;
};

/**
 * **`product` 는 요약이 아니라 `ProductResponse` 전문이다.**
 *
 * 예전에는 `{ id: string }` 으로 선언해 두고 색인을 만든 뒤 나머지를 버렸는데, 서버는 처음부터
 * 이름·사진·소재·케어·가격까지 전부 보내고 있었다. 리워드가 "몇 장 중 몇 장"을 셀 수 있는
 * 근거가 이 전문이고, 그래서 아래 `byCollection` 이 생겼다.
 */
export type CollectionItemResponse = {
  product: ProductResponse;
  required: boolean;
  displayOrder: number;
};

export const fetchProductCollections = () =>
  request<ProductCollectionResponse[]>('/product-collections');

const fetchCollectionItems = (id: string) =>
  request<CollectionItemResponse[]>(`/product-collections/${id}/products`);

export type CollectionIndex = {
  /** 컬렉션 id → 컬렉션. 리워드가 브랜드를 되찾을 때 쓴다. */
  byId: Map<string, ProductCollectionResponse>;
  /** 상품 id → 그 상품이 속한 공식 컬렉션. */
  byProduct: Map<string, ProductCollection>;
  /**
   * 컬렉션 id → 그 세트를 이루는 상품 전부.
   *
   * `byProduct` 가 "이 상품은 어느 세트의 것인가"라면 이쪽은 "이 세트는 무엇으로 이루어지는가"
   * 다. 보유 카드와 빼면 **아직 없는 것**이 남고, 그것이 추천 화면의 전부다. 같은 응답에서
   * 나오므로 요청은 한 번도 늘지 않는다.
   */
  byCollection: Map<string, CollectionItemResponse[]>;
};

const EMPTY: CollectionIndex = { byId: new Map(), byProduct: new Map(), byCollection: new Map() };

let index: Promise<CollectionIndex> | null = null;

/**
 * 색인을 만들고, 만든 것을 계속 쓴다.
 *
 * 한 상품이 여러 컬렉션에 들어갈 수 있다(`product_collection_items` 는 다대다). 카드에는 한
 * 줄만 들어가므로 **처음 만난 것을 쓴다** — 우선순위를 매길 근거가 응답에 없고, 없는 근거를
 * 지어내느니 규칙이 단순한 편이 낫다. 필요해지면 그때 백엔드에 대표 컬렉션을 물어본다.
 */
export function fetchCollectionIndex(): Promise<CollectionIndex> {
  if (index) return index;

  index = (async () => {
    const collections = await fetchProductCollections();
    const byId = new Map(collections.map((c) => [c.id, c]));
    const byProduct = new Map<string, ProductCollection>();
    const byCollection = new Map<string, CollectionItemResponse[]>();

    // 컬렉션 하나가 실패해도 나머지 색인은 살린다 — 시트의 한 줄 때문에 카드 화면 전체가
    // 비는 것은 균형이 맞지 않는다.
    const lists = await Promise.all(
      collections.map((c) => fetchCollectionItems(c.id).catch(() => [] as CollectionItemResponse[])),
    );

    collections.forEach((collection, i) => {
      byCollection.set(collection.id, lists[i]);
      for (const item of lists[i]) {
        if (!byProduct.has(item.product.id)) {
          byProduct.set(item.product.id, { id: collection.id, name: collection.name });
        }
      }
    });

    return { byId, byProduct, byCollection };
  })().catch(() => {
    // 색인이 없으면 컬렉션 줄이 안 보일 뿐, 카드는 멀쩡하다. 다음 호출에서 다시 시도한다.
    index = null;
    return EMPTY;
  });

  return index;
}
