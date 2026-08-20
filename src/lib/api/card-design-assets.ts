import { request } from './client';
import { assetUrl } from '../config';
import type { Uuid } from '../types';

/**
 * `GET /cards/{cardId}/customization-options` — 브랜드가 승인해 둔, 고를 수 있는 것들.
 *
 * **AI 후보와 정반대의 물건이다.** 저쪽은 요청할 때마다 새로 만들어지고 기다려야 하지만,
 * 이쪽은 이미 DB 에 들어 있고 브랜드가 승인한 유한한 목록이다. 그래서 이 파일에는 생성도
 * 폴링도 상태도 없다 — 한 번 부르고 끝이다.
 *
 * 카드 소유자만, `ACTIVE` 카드만 부를 수 있다. 배경은 **그 카드의 상품**에 묶여 있고,
 * 테두리와 뒷면은 브랜드에 묶여 있다 — 다른 상품의 배경을 고르면 저장이 409 로 거절된다.
 */

type DesignAssetResponse = {
  id: string;
  assetKey: string;
  type: string;
  name: string;
  variantCode: string;
  imageUrl: string;
  transparent: boolean;
  width: number;
  height: number;
  metadata: Record<string, unknown> | null;
};

type CustomizationOptionsResponse = {
  cardId: string;
  productId: string;
  front: {
    productBackgrounds: DesignAssetResponse[] | null;
    borders: DesignAssetResponse[] | null;
  } | null;
  back: {
    layoutId: string;
    baseImageUrl: string | null;
    /** 뒷면 글자의 좌표·폰트·색. **읽지 않는다** — 뒷면은 `CardBack` 이 우리 토큰으로 그린다. */
    layoutData: Record<string, unknown> | null;
  } | null;
};

/**
 * 고를 수 있는 그림 한 장.
 *
 * `variantCode` 가 이름을 대신한다 — 배경은 `A`·`B`·`C`, 테두리는 `01`~`03` 이고, 시드의
 * `name`(`"Product 005 Background A"`)은 영문 관리용 이름이라 화면에 낼 수 없다. 격자에서
 * 고르는 물건에는 어차피 그림이 이름이다.
 */
export type DesignAsset = {
  id: Uuid;
  variantCode: string;
  imageUrl: string | null;
  /** 알파 채널이 있는가. 테두리는 항상 참이고, 그래서 배경 위에 겹칠 수 있다. */
  transparent: boolean;
};

export type CustomizationOptions = {
  productId: Uuid;
  backgrounds: DesignAsset[];
  borders: DesignAsset[];
  /** 저장할 때 되돌려 보내야 하는 값. 지금은 브랜드당 하나뿐이다. */
  backLayoutId: Uuid | null;
};

function toAsset(res: DesignAssetResponse): DesignAsset {
  return {
    id: res.id,
    variantCode: res.variantCode,
    imageUrl: assetUrl(res.imageUrl),
    transparent: res.transparent,
  };
}

export async function fetchCustomizationOptions(cardId: string): Promise<CustomizationOptions> {
  const res = await request<CustomizationOptionsResponse>(
    `/cards/${cardId}/customization-options`,
  );
  return {
    productId: res.productId,
    /* 목록이 비어 있는 것은 오류가 아니라 답이다 — 아직 승인된 디자인이 없는 상품이 있고,
       화면은 그것을 빈 상태로 말한다. */
    backgrounds: (res.front?.productBackgrounds ?? []).map(toAsset),
    borders: (res.front?.borders ?? []).map(toAsset),
    backLayoutId: res.back?.layoutId ?? null,
  };
}
