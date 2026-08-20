import type { ImageSourcePropType } from 'react-native';

import { MOCK_BRAND_MARKS } from './mock/brand-marks';
import { MOCK_CARD_ART } from './mock/card-art';
import type { Brand, Card, CardFaceLayer } from './types';

/**
 * 카드의 그림이 어디서 오는지, 한 곳에서 정한다.
 *
 * 백엔드가 가진 것이 있으면 그것이 이긴다. 없을 때만 번들된 그림이 대신 선다. 그 순서 덕분에
 * 카드가 목에서 실데이터로 옮겨가도 얼굴을 다시 쓰지 않는다 — 생성이 돌기 시작하면 이 함수가
 * 폴백까지 내려가지 않게 되고, 위쪽은 아무것도 눈치채지 못한다.
 *
 * `null` 은 실패가 아니라 답이다. 그림 없는 카드는 브랜드의 색으로 채워진, 완성된 상태다.
 *
 * **한때 여기 토큰을 실어 보내는 층이 있었다.** 백엔드가 `/images/**` 를 인증 뒤에 두던 시절,
 * 웹에서는 `<img>` 에 헤더를 실을 수 없어 `fetch` 로 받아 `blob:` 으로 바꿔치기해야 했다.
 * 그 경로는 이제 없다 — 두 경로 모두 permitAll 이고(실측 200 image/png),
 * 남겨두면 손해만 본다: blob 을 받는 동안 그림 자리가 비고, 토큰이 없는 순간에는 공개 이미지
 * 마저 영영 뜨지 않는다.
 */
export function cardArtSource(card: Card): ImageSourcePropType | null {
  /* 레이어로 꾸민 카드에는 그림 한 장이라는 것이 없다. `CardLayerStack` 이 세 겹을 그리므로
     밑에 깔 것도 없다 — 여기서 상품 사진을 돌려주면 배경 뒤에서 아무도 못 보는 이미지를
     한 장 더 받게 된다. */
  if (cardFaceLayers(card).length > 0) return null;
  /* 꾸민 카드는 꾸민 얼굴을 갖는다. 이 한 줄이 편집 화면의 결과가 컬렉션에 반영되는 유일한
     지점이라, 없으면 저장이 끝난 뒤에도 카드가 그대로여서 편집 기능 전체가 무의미해진다. */
  if (card.customization?.frontImageUrl) return { uri: card.customization.frontImageUrl };
  if (card.product.imageUrl) return { uri: card.product.imageUrl };
  return MOCK_CARD_ART[card.id] ?? null;
}

/**
 * 카드의 얼굴을 이루는 겹들. 승인 에셋으로 꾸민 카드만 갖는다.
 *
 * `cardArtSource()` 와 짝이다 — 둘 중 하나만 값을 갖고, 어느 쪽인지는 이 함수가 먼저 답한다.
 * 비어 있는 배열은 "레이어가 없다"는 사실이고 오류가 아니다.
 */
export function cardFaceLayers(card: Card): CardFaceLayer[] {
  return card.customization?.layers ?? [];
}

/**
 * 주소 한 줄을 `<Image>` 가 받는 소스로.
 *
 * 주소가 없으면 `null` 이고, 그건 오류가 아니라 그릴 그림이 없다는 사실이다. 부르는 쪽은
 * `CardFace` 가 마크 없는 브랜드에 하는 것과 같이 이름을 타이포로 세우면 된다.
 *
 * 주소를 절대 URL 로 만드는 일은 이미 API 층의 `assetUrl()` 이 끝냈다 — 여기까지 온 값은
 * 부를 수 있는 주소이거나 `null` 둘 중 하나다.
 */
export function imageSource(url: string | null | undefined): ImageSourcePropType | null {
  return url ? { uri: url } : null;
}

/**
 * 하우스의 마크. 카드 그림과 같은 순서로 정해진다 — 백엔드가 먼저, 번들은 없을 때만.
 *
 * `null` 도 지원되는 답이다. 마크 없는 브랜드는 이름을 타이포로 서명하고, 그건 어느 브랜드든
 * 마크가 생기기 전까지 하던 일이다.
 */
export function brandMarkSource(brand: Brand): ImageSourcePropType | null {
  if (brand.logoUrl) return { uri: brand.logoUrl };
  return MOCK_BRAND_MARKS[brand.id] ?? null;
}
