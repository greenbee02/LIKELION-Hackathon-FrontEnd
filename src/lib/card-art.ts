import { useEffect, useReducer } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';

import { getAccessToken } from './api/client';
import { API_ORIGIN } from './config';
import { MOCK_BRAND_MARKS } from './mock/brand-marks';
import { MOCK_CARD_ART } from './mock/card-art';
import type { Brand, Card } from './types';

/**
 * Where a card's artwork comes from, resolved in one place.
 *
 * The backend wins when it has something: `product.imageUrl` is a real URL and becomes a `uri`
 * source. Only when it has nothing does the bundled mock stand in. That order is what lets a card
 * move from mock to live without the face being rewritten — when the AI pipeline starts returning
 * images, this function stops falling through and nothing above it notices.
 *
 * `null` is a real answer, not a failure: a card with no artwork shows the brand's own colour,
 * which is a finished state rather than a gap.
 */
export function cardArtSource(card: Card): ImageSourcePropType | null {
  if (card.product.imageUrl) return authorized(card.product.imageUrl);
  return MOCK_CARD_ART[card.id] ?? null;
}

/**
 * 서버의 이미지에 토큰을 실어 보낸다.
 *
 * 상품 사진은 `/images/products/*.png` 에 있고 이 경로가 permitAll 목록에서 빠져 있어서,
 * 토큰 없이 부르면 401 이고 사진이 통째로 비어 보인다. 네이티브의 `<Image>` 는 헤더를 받으니
 * 여기서 끝나고, 웹은 `<img>` 에 헤더를 실을 수 없어 `useCardArt()` 가 이어받는다.
 *
 * 백엔드에 `/images/**` 공개를 요청해 둔 상태다 (연동 계획 §4-3). 열리면 이 함수와
 * `useCardArt()` 의 웹 경로가 함께 사라진다.
 */
function authorized(uri: string): ImageSourcePropType {
  const token = getAccessToken();
  if (!token || Platform.OS === 'web') return { uri };
  return { uri, headers: { Authorization: `Bearer ${token}` } };
}

/**
 * 백엔드가 준 주소인가. 외부 절대 URL 은 우리 인증과 무관하므로 건드리지 않는다.
 *
 * `API_ORIGIN` 은 프록시 뒤에서 빈 문자열이 된다(`EXPO_PUBLIC_API_URL=/api/v1`). 그때
 * 백엔드 자산은 `/images/...` 같은 루트 상대 경로로 오므로 `/` 로 시작하는지가 판별 기준이 되고,
 * AI 가 만든 외부 스토리지 URL(`https://...`)은 자연히 걸러진다.
 */
function isBackendAsset(uri: string): boolean {
  return API_ORIGIN ? uri.startsWith(API_ORIGIN) : uri.startsWith('/');
}

/** 웹에서만 쓰는 `uri → blob URL` 캐시. 같은 상품을 여러 카드가 공유해도 한 번만 받는다. */
const blobUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * 보호된 이미지를 토큰을 실어 받아 `blob:` 주소로 바꾼다.
 *
 * 실패는 `null` 로 끝내고 캐시하지 않는다 — 토큰이 아직 없거나 네트워크가 끊긴 순간일 수 있고,
 * 그런 이유로 이 세션 내내 사진을 포기할 필요는 없기 때문이다. 실패한 카드는 브랜드 액센트만
 * 남은 완성된 상태로 보인다.
 */
function loadAuthorizedBlob(uri: string): Promise<string | null> {
  const running = inFlight.get(uri);
  if (running) return running;

  const task = (async () => {
    const token = getAccessToken();
    if (!token) return null;
    try {
      const res = await fetch(uri, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const url = URL.createObjectURL(await res.blob());
      blobUrls.set(uri, url);
      return url;
    } catch {
      return null;
    } finally {
      inFlight.delete(uri);
    }
  })();

  inFlight.set(uri, task);
  return task;
}

/** `{uri}` 형태이면서 백엔드 자산인 웹 소스만 골라낸다. 번들 목 이미지는 숫자라 여기서 걸러진다. */
function protectedUri(source: ImageSourcePropType | null): string | null {
  if (Platform.OS !== 'web' || !source) return null;
  if (typeof source !== 'object' || Array.isArray(source)) return null;
  const { uri } = source as { uri?: string };
  if (!uri) return null;
  return isBackendAsset(uri) ? uri : null;
}

/**
 * 화면이 카드 아트를 얻는 곳. `cardArtSource()` 를 감싸 **웹의 401 문제만** 해결한다.
 *
 * `<img>` 태그에는 `Authorization` 헤더를 실을 수 없다. 그래서 브라우저가 이미 들고 있는
 * 토큰으로 `fetch` 해서 받아온 뒤 `blob:` 주소로 바꿔 넘긴다 — 서비스 계정도, 프록시에 심는
 * 자격증명도 필요 없다. 요청이 프론트와 같은 출처(`/images/...`)로 나가므로 CORS 도 발생하지
 * 않는다.
 *
 * 받는 동안은 `null` 이고, 그동안 화면에는 브랜드 액센트가 채워진 얼굴이 보인다. 이건 로딩
 * 상태가 아니라 `CardFace` 가 원래 갖고 있던 "아트가 없는 카드"의 완성된 모습이고, 도착하면
 * `<Image transition>` 이 그 위로 페이드인한다. 스켈레톤이 필요 없는 이유다.
 *
 * `blob:` 주소는 세션 내내 유지하고 회수하지 않는다. 같은 사진을 여러 카드가 공유하므로 어느
 * 한 카드의 언마운트에서 회수하면 아직 떠 있는 다른 카드의 사진이 깨진다. 상품 수만큼만
 * 쌓이는 양이라 그대로 두는 편이 맞다.
 */
export function useCardArt(card: Card): ImageSourcePropType | null {
  const source = cardArtSource(card);
  const uri = protectedUri(source);

  // 캐시는 렌더 시점에 직접 읽고, 이 상태는 "도착했다"는 신호로만 쓴다. 값을 상태에 복사해 두면
  // 캐시와 두 벌이 되고, 그걸 맞추려 effect 안에서 동기적으로 setState 하게 된다.
  const [, arrived] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!uri || blobUrls.has(uri)) return;

    let alive = true;
    void loadAuthorizedBlob(uri).then((url) => {
      if (alive && url) arrived();
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  if (!uri) return source;
  const blobUrl = blobUrls.get(uri);
  return blobUrl ? { uri: blobUrl } : null;
}

/**
 * The house's mark, resolved the same way and in the same order: the backend first, the bundled
 * mock only when it has nothing.
 *
 * `null` is a supported answer — a brand with no mark signs its cards with its name set in type,
 * which is what every brand did before any mark existed.
 */
export function brandMarkSource(brand: Brand): ImageSourcePropType | null {
  if (brand.logoUrl) return { uri: brand.logoUrl };
  return MOCK_BRAND_MARKS[brand.id] ?? null;
}
