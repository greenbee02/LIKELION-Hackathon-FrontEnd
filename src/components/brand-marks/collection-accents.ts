/**
 * 공식 컬렉션의 색 — `product_collections.theme` 하나에 한 색씩.
 *
 * **이 폴더에 있는 이유와, 이 파일만 다른 점.** 옆의 `google.tsx` · `apple.tsx` · `palettes.ts`
 * 는 *실제로* 남의 것인 색을 담는다. 이 파일은 하우스의 컬렉션에 붙는 색인데 — `Brand.accent`
 * 가 카드 브랜드의 강조색을 데이터로 나르는 것과 같은 자리다 — **아직 그 데이터가 없다.**
 * `GET /product-collections` 의 응답에 색 열이 없어서, 아래 값들은 서버가 준 것이 아니라
 * 우리가 고른 것이다.
 *
 * 그러니 이것은 `src/lib/mock/brand-marks.ts` 와 같은 성격이다 — 데이터가 아니라 **폴백**.
 * `product_collections` 에 색 열이 생기는 날 이 파일은 지우고 응답을 쓴다. 그때까지는
 * 여기 한 곳에만 있어서, 지울 때 한 번에 지워진다.
 *
 * **연한 색조가 아니라 꽉 찬 색이다.** 처음에는 흰 패널에 파스텔 바탕을 깔았는데, 그것은
 * 어느 앱에나 있는 무성의한 기본값처럼 보였다 — 색이 있다고도 없다고도 할 수 없는 상태다.
 * 색을 쓰기로 했으면 색이 면을 갖게 두는 편이 낫고, 그러면 글자는 흰색이 되고 테두리는
 * 필요가 없어진다. 면이 이미 경계이기 때문이다.
 *
 * **`theme` 은 네트워크에서 오는 값이라 exhaustive 하게 다루지 않는다.** 백엔드가 여섯 번째
 * 테마를 더하는 날 `assertNever` 가 화면을 내리는 대신, 모르는 값은 아래 `NEUTRAL` 로
 * 조용히 떨어진다.
 */
import { Flower2, Gem, Gift, MapPin, Plane, Sparkles } from 'lucide-react-native';
import type { ComponentType } from 'react';

import { colors } from '@/theme/colors';

export type CollectionAccent = {
  /** 면 전체를 채우는 색. 그 위에 오는 글자는 전부 흰색(1단계)이다. */
  fill: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

/**
 * 다섯 테마, 다섯 색.
 *
 * 색조는 뜻을 따라간다 — 지역은 장미(서울), 신상은 초록, 여성 시그니처는 보라, 여행은 파랑,
 * 아이코닉은 청동.
 *
 * **다섯 개가 흰 글자에서 같은 거리에 있다** — 대비 4.7:1 근처로 맞춰 두었다. 처음에는 각
 * 색조에서 보기 좋은 깊이를 따로 골랐는데, 그러면 보라(7.0)와 청동(4.9)이 같은 목록에 서면서
 * 보라 줄만 소리를 질렀다. **한 줄이 유독 강렬한 것은 그 리워드가 더 중요해서가 아니라 색조가
 * 우연히 그런 것**이고, 목록은 그 우연을 중요도로 읽는다. 거리를 맞추면 다섯 색이 같은
 * 목소리로 말한다.
 *
 * 4.5:1 은 16pt 흰 글자의 AA 기준이라 그 아래로는 내려갈 수 없다 — 더 연하게 가려면 글자가
 * 흰색이 아니게 되어야 하고, 그것은 이 화면의 설계를 다시 여는 일이다.
 */
const ACCENTS: Record<string, CollectionAccent> = {
  REGIONAL: { fill: '#CC4163', icon: MapPin },
  NEW_ARRIVAL: { fill: '#2B834C', icon: Sparkles },
  WOMEN: { fill: '#9357C7', icon: Flower2 },
  TRAVEL: { fill: '#4F6FCA', icon: Plane },
  ICONIC: { fill: '#9B6922', icon: Gem },
};

/**
 * 테마를 모를 때.
 *
 * 컬렉션 색인이 아직 안 왔거나(`theme` 이 `null`), 백엔드가 새 테마를 더했을 때 여기로 온다.
 * **비워 두지 않고 12단계로 채운다** — 테두리를 지운 목록에서 흰 면은 면이 아니라 없는 것이
 * 되고, 한 줄만 사라진 목록이 색이 하나 모자란 목록보다 나쁘다. 회색 토큰이므로 새 테마가
 * 색을 못 받았다는 사실도 보는 사람에게 정직하게 보인다.
 */
const NEUTRAL: CollectionAccent = { fill: colors.solidStrong, icon: Gift };

export const collectionAccent = (theme: string | null | undefined): CollectionAccent =>
  (theme && ACCENTS[theme]) || NEUTRAL;
