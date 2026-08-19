import { request } from './client';

/**
 * `GET /products/{id}` — 카드가 말하지 못하는 상품의 나머지 전부.
 *
 * **이 모듈이 존재하는 이유는 `CardResponse.product` 가 좁기 때문이다.** 카드가 실어 오는
 * `ProductSummary` 에는 6개 필드밖에 없고 브랜드도 소재도 보증도 없는데, 같은 상품을 여기서
 * 부르면 전부 들어 있다. 그래서 카드는 이 응답으로 한 번 더 채워진다 (`hydrateCard`).
 *
 * **인증이 필요 없다** — `SecurityConfig` 의 permitAll 목록에 `/api/v1/products/**` 가 있다.
 * 토큰이 만료된 순간에도 상품 정보는 계속 붙는다는 뜻이고, 덕분에 카드 화면이 인증 상태에
 * 덜 묶인다.
 */

/** 백엔드의 `ProductResponse` 그대로. 주지 않는 필드는 여기서 지어내지 않는다. */
export type ProductResponse = {
  id: string;
  brandId: string;
  brandName: string;
  productCode: string | null;
  name: string;
  offeringType: string;
  category: string | null;
  theme: string | null;
  productionYear: number | null;
  season: string | null;
  region: string | null;
  material: string | null;
  color: string | null;
  origin: string | null;
  description: string | null;
  imageUrl: string | null;
  warrantyInfo: string | null;
  warrantyMonths: number | null;
  careInfo: string | null;
  experienceLocation: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  /** 받기는 하지만 화면에 쓰지 않는다 — 얼마 줬는지 적는 순간 수집품이 영수증이 된다. */
  price: number | null;
  limited: boolean;
};

/**
 * 상품 단위 캐시.
 *
 * 카드 N장이면 요청이 N+1번처럼 보이지만, 같은 상품의 카드는 한 번만 부른다. 상품은 카드보다
 * 적고 앱이 살아 있는 동안 변하지 않으므로, 실제 왕복은 고유 상품 수만큼이다.
 *
 * 실패한 요청은 캐시하지 않는다 — 한 번 끊긴 네트워크 때문에 그 상품이 영원히 비는 것은
 * 캐시가 할 일이 아니다.
 */
const cache = new Map<string, Promise<ProductResponse>>();

export function fetchProduct(id: string): Promise<ProductResponse> {
  const hit = cache.get(id);
  if (hit) return hit;

  const inflight = request<ProductResponse>(`/products/${id}`).catch((e) => {
    cache.delete(id);
    throw e;
  });
  cache.set(id, inflight);
  return inflight;
}
