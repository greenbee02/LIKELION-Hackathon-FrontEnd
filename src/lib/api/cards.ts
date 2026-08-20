import { request } from './client';
import { fetchCustomizations } from './customizations';
import { fetchProduct, type ProductResponse } from './products';
import { fetchCollectionIndex } from './product-collections';
import { assetUrl } from '../config';
import { categoryLabel, seasonLabel } from '../labels';
import { colors } from '@/theme/colors';
import type { Card, CardStatus, CardType, Product } from '../types';

/**
 * `GET /cards` · `GET /cards/{id}` 와, 그 응답을 화면이 쓰는 `Card` 로 바꾸는 일.
 *
 * 자세한 배경은 `dev/active/backend-contract.md` §2.
 */

/** 백엔드의 `CardResponse` 그대로. 주지 않는 필드는 지어내지 않는다. */
export type CardResponse = {
  id: string;
  originalCardType: CardType;
  cardType: CardType;
  status: CardStatus;
  purchaseDate: string;
  issuedAt: string;
  serialNumber: string;
  /** `ProductSummary` — 여섯 개뿐이다. 나머지는 `GET /products/{id}` 가 갖고 있다. */
  product: {
    id: string;
    name: string;
    offeringType: string;
    category: string | null;
    imageUrl: string | null;
    limited: boolean;
  };
  store: { id: string; name: string; country: string; city: string };
  template: {
    id: string;
    name: string;
    frontImageUrl: string | null;
    backImageUrl: string | null;
    allowedCardType: 'BASIC' | 'COLLECTOR' | null;
  };
  selectedCustomization: {
    id: string;
    status: string;
    generatedFrontImageUrl: string | null;
    generatedBackImageUrl: string | null;
    generatedMessage: string | null;
    createdAt: string;
  } | null;
};

/**
 * 카드 한 장을 상품 상세로 채운다.
 *
 * **브랜드가 여기서 정해진다.** 이전에는 시리얼 접두사(`MCM-SE-0042`)에서 하우스를 추측했는데,
 * 그건 수명이 짧은 추측이었다. 상품 응답이 `brandId`/`brandName` 을 직접 주므로 추측이
 * 사라졌다. 다만 **브랜드의 색과 마크는 여전히 어느 DTO 에도 없다** — `brands` 테이블에
 * `logo_url` 컬럼은 있는데(V4) 노출되지 않는다. 그래서 액센트는 토큰으로 두고 마크는 null 로
 * 둔다. 마크 없는 브랜드는 이름을 타이포로 서명하고, 그건 결함이 아니라 지원되는 상태다.
 *
 * 상품 조회가 실패해도 카드는 살린다. 카드가 실어 온 여섯 필드만으로 앞면은 온전히 그려지고,
 * 없는 것은 뒷면과 시트의 몇 줄뿐이다 — 값 없는 행은 원래 렌더하지 않는다.
 */
export async function hydrateCard(res: CardResponse): Promise<Card> {
  const [detail, index, customization] = await Promise.all([
    fetchProduct(res.product.id).catch(() => null),
    fetchCollectionIndex(),
    withLayers(res.id, toCustomization(res.selectedCustomization)),
  ]);

  return {
    id: res.id,
    cardType: res.cardType,
    status: res.status,
    purchaseDate: res.purchaseDate,
    issuedAt: res.issuedAt,
    serialNumber: res.serialNumber,
    brand: {
      id: detail?.brandId ?? 'unknown',
      name: detail?.brandName ?? '',
      accent: colors.solid,
      logoUrl: null,
    },
    product: toProduct(res, detail, index.byProduct.get(res.product.id)),
    store: res.store,
    template: res.template ?? undefined,
    customization,
  };
}

/**
 * 레이어로 꾸민 카드의 얼굴을 마저 가져온다.
 *
 * **`CustomizationSummary` 에는 레이어가 없다.** `GET /cards` 는 꾸몄다는 사실만 알려주고
 * 무엇으로 꾸몄는지는 알려주지 않아서, 승인 에셋으로 꾸민 카드는 목록에서 얼굴이 비어 버린다.
 * 그래서 카드마다 한 번 더 묻는다.
 *
 * **왕복이 느는 것은 선택된 커스텀 카드마다 한 번이다.** AI 합성은 실제 배경 URL을
 * `generatedFrontImageUrl`에 저장하지만, 상세 레이어와 뒷면 스냅샷은 여전히
 * `customizationData` 안에 있으므로 완료된 커스텀은 여기서 보충한다. 만들다 만 AI 커스텀
 * (`PENDING`·`PROCESSING`)은 아직 완료가 아니므로 여기서 걸러진다.
 *
 * 실패해도 카드 자체는 살린다. 다만 AI 합성의 실제 앞면 주소를 먼저 보존해 두었으므로,
 * 레이어 보충 요청이 실패해도 템플릿 테두리로 바뀌지 않는다.
 *
 * **`backend-open-items.md` §2 가 해결되면 이 함수를 통째로 지운다.** `CustomizationSummary`
 * 가 `frontLayers` 를 실어 오면 왕복 자체가 없어진다.
 */
async function withLayers(
  cardId: string,
  customization: Card['customization'],
): Promise<Card['customization']> {
  if (
    !customization ||
    customization.status !== 'COMPLETED' ||
    customization.layers.length > 0
  ) {
    return customization;
  }
  const list = await fetchCustomizations(cardId).catch(() => null);
  const found = list?.find((c) => c.id === customization.id);
  if (!found?.layers.length) return customization;
  return { ...customization, layers: found.layers, back: found.back };
}

/**
 * 응답의 `selectedCustomization` 을 화면이 쓰는 이름으로 옮긴다.
 *
 * 이름만 바꾼다 — `generatedFrontImageUrl` 은 "생성된"이 붙어야 서버 쪽 사정이 드러나지만,
 * 화면 입장에서 그건 그냥 이 카드의 앞면이다. 주소는 `assetUrl()` 을 태운다: 합성 결과가
 * `/generated/...` 상대 경로로 오기 때문이고, 이미 절대 URL 이면 그대로 지나간다.
 */
function toCustomization(
  res: CardResponse['selectedCustomization'],
): Card['customization'] {
  if (!res) return undefined;
  return {
    id: res.id,
    status: res.status,
    frontImageUrl: assetUrl(res.generatedFrontImageUrl),
    backImageUrl: assetUrl(res.generatedBackImageUrl),
    message: res.generatedMessage,
    createdAt: res.createdAt,
    /* 요약에는 레이어가 없다. `withLayers()` 가 필요할 때만 채운다. */
    layers: [],
    back: null,
  };
}

function toProduct(
  res: CardResponse,
  detail: ProductResponse | null,
  collection: Product['collection'],
): Product {
  return {
    id: res.product.id,
    name: res.product.name,
    // 카테고리는 양쪽에 다 있지만 코드값이라, 한국어로 옮긴 뒤에 쓴다.
    category: categoryLabel(detail?.category ?? res.product.category) ?? '',
    // 상품 사진은 `/images/products/prod_001.png` 같은 상대 경로로 온다.
    imageUrl: assetUrl(detail?.imageUrl ?? res.product.imageUrl),
    limited: res.product.limited,
    material: detail?.material ?? undefined,
    color: detail?.color ?? undefined,
    origin: detail?.origin ?? undefined,
    warrantyMonths: detail?.warrantyMonths ?? undefined,
    warrantyInfo: detail?.warrantyInfo ?? undefined,
    careInfo: detail?.careInfo ?? undefined,
    season: seasonLabel(detail?.season),
    code: detail?.productCode ?? undefined,
    collection,
  };
}

const fetchCardList = () => request<CardResponse[]>('/cards');

/** 내 카드 전부. 목록 한 번, 그다음 고유 상품 수만큼의 조회로 채워진다. */
export async function fetchCards(): Promise<Card[]> {
  const list = await fetchCardList();
  return Promise.all(list.map(hydrateCard));
}

export async function fetchCard(id: string): Promise<Card> {
  return hydrateCard(await request<CardResponse>(`/cards/${id}`));
}
