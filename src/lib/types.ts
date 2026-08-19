/** Mirrors the backend's `CardResponse`, plus `brand` — see dev/active/scope-vs-backend.md §5-1. */

/**
 * 백엔드가 uuid 라고 부르는 자리.
 *
 * **문서이지 방어가 아니다.** 브랜디드 타입(`string & {__uuid}`)이면 `cardId` 자리에
 * `productId` 를 넣는 것을 컴파일러가 막아주지만, 이 앱의 모든 id 는 `request<T>()` 의
 * `body?.data as T` 를 통과해 들어오므로 DTO 경계마다 캐스트가 필요해진다. 런타임 검증기가
 * 없는 상태에서 그 캐스트는 안전을 사지 못하고 잡음만 늘린다.
 *
 * 별칭은 **도메인 타입과 새 모듈에만** 쓴다. 기존 DTO 파일들을 `string` 에서 일괄 치환하는
 * 것은 구조적으로 동일한 타입 사이의 무의미한 diff다 — tsc 는 한 줄도 다르게 읽지 않는다.
 */
export type Uuid = string;

/** ISO-8601 UTC 문자열. 사람이 읽는 것으로 바뀌는 곳은 `src/lib/format.ts` 하나뿐이다. */
export type IsoDateTime = string;

export type CardType = 'BASIC' | 'CUSTOMIZE' | 'COLLECTOR';
export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'REVOKED';

export type Brand = {
  id: string;
  name: string;
  /** The brand's accent, carried as data. The app's own chrome never uses it. */
  accent: string;
  /**
   * The house's own mark, as a URL — a transparent PNG or SVG of the wordmark or monogram.
   *
   * Carried as data for the same reason the accent is: onboarding a house must be a row in a
   * table, never a component in this repo. The card face tints it to white and falls back to the
   * name set in type when it is null, so a brand without a mark is a supported state and not a
   * hole in the design.
   *
   * The backend does not expose this yet — see `dev/active/scope-vs-backend.md` §5-1, which is
   * already waiting on `CardResponse.brand` at all.
   */
  logoUrl: string | null;
};

/**
 * An official collection a product belongs to — `Seoul Exclusive`, `MCM Icons`.
 *
 * The house's set, not the customer's folder. It matters beyond a label because it is the unit
 * rewards are counted on (`collection_rewards.required_percentage` in the schema draft), so a
 * card knowing its collection is what eventually connects the detail screen to the reward that
 * finishing the set unlocks.
 *
 * Kept to id and name on purpose. The backend has `product_collections` with a cover image, a
 * theme, a year and a limited flag, but none of it is exposed yet and guessing at the shape of
 * something unbuilt is how a type ends up describing nothing.
 */
export type ProductCollection = { id: string; name: string };

export type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  limited: boolean;
  /** §5-2 — columns exist, DTO does not expose them yet. Mock until it does. */
  material?: string;
  /**
   * `products.color` — 하우스가 부르는 색 이름이지 색상값이 아니다.
   *
   * 실서버가 `Cognac` `Orangeade` `Cinnamon` 같은 이름을 주고, 그중에는 `Aw26 Sangria Sunset`
   * 처럼 색이 아니라 시즌 팔레트 이름인 것도 섞여 있다. **그래서 이 값으로 필터를 만들지
   * 않는다** — 목록으로 세우는 순간 색이 아닌 항목이 색인 척하게 된다. 읽을 거리로만 쓴다.
   */
  color?: string;
  origin?: string;
  warrantyMonths?: number;
  careInfo?: string;
  season?: string;
  /**
   * The model number, `products.product_code`. Every unit of this product shares it, which is
   * exactly what makes it a different thing from `Card.serialNumber` — the brief (§4) lists both,
   * and the two live on opposite surfaces of the card for that reason.
   */
  code?: string;
  /** What the warranty actually covers, `products.warranty_info` — prose beside `warrantyMonths`. */
  warrantyInfo?: string;
  collection?: ProductCollection;
};

export type Store = { id: string; name: string; country: string; city: string };

/**
 * 고객이 만든 컬렉션 — 하우스가 묶은 `ProductCollection` 과 이름만 비슷한 다른 물건이다.
 *
 * 공식 컬렉션은 상품을 묶고 리워드가 세어지는 단위이지만, 이쪽은 **카드를 묶고 아무것도
 * 해금하지 않는다.** 서울에서 산 것만 모아두거나 첫 카드를 따로 두는, 순전히 개인의 분류다.
 *
 * **`cards` 를 통째로 받지 않고 id 만 남긴다.** 응답은 `CardResponse[]` 를 실어 오는데 그것을
 * 카드로 만들려면 `hydrateCard()` 가 다시 돌아야 하고, 그러면 컬렉션 하나를 열 때마다 상품
 * 조회가 담긴 카드 수만큼 더 나간다. 카드 본문은 `useCards()` 가 이미 전부 들고 있으므로
 * 여기서는 **어느 카드가 들어 있는지만** 알면 된다.
 */
export type UserCollection = {
  id: string;
  name: string;
  description?: string;
  coverImageUrl: string | null;
  /**
   * `collections.collection_type` — DB 는 `CUSTOM` 과 `AI` 를 구분하지만 **생성 요청에는 이
   * 필드가 없다.** 무엇으로 만들었든 서버에는 `CUSTOM` 으로 저장되므로, 화면이 이 값을 근거로
   * "AI 가 만든 컬렉션"이라고 말하면 저장된 것과 다른 말을 하게 된다.
   */
  collectionType: 'CUSTOM' | 'AI';
  createdAt: string;
  updatedAt: string;
  cardCount: number;
  cardIds: string[];
};

/**
 * 템플릿이 실어 오는 디자인 값 — `card_templates.resource_data` 를 파싱한 것.
 *
 * 백엔드는 이것을 **JSON 문자열 한 덩어리로** 준다. 파싱은 API 층에서 한 번만 하고 위쪽은
 * 객체만 본다 — 화면이 `JSON.parse` 를 부르기 시작하면 실패 처리가 화면마다 흩어진다.
 *
 * 전부 옵셔널인 이유는 이 값이 스키마가 아니라 **자유 JSON** 이기 때문이다. 컬럼 하나에 담긴
 * 이상 어떤 키가 오는지는 시드가 정하고, 지금 시드에 있다고 다음 브랜드도 채운다는 보장이
 * 없다. 없는 키를 옵셔널로 두는 것이 있는 척하는 것보다 정확하다.
 *
 * **여기 색들은 `brand-marks/` 규칙의 예외가 아니라 그 규칙 자체다.** 하우스의 색은 데이터로
 * 여행한다는 것이 원칙이고, 이 필드가 그 원칙이 실제로 지켜지는 첫 경로다.
 */
export type TemplateResource = {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  pattern?: string;
  fontStyle?: string;
  graphicStyle?: string;
  frontLayout?: string;
  backLayout?: string;
};

/**
 * 카드에 붙어 있는 템플릿. `CardResponse.template` 이 주는 만큼만이다.
 *
 * `GET /card-templates` 가 돌려주는 `CardTemplate` 과 **같은 것의 다른 크기**다 — 카드 응답의
 * 것에는 브랜드도 설명도 `resourceData` 도 없다. 편집 화면은 목록을 따로 불러 id 로 맞춘다.
 */
export type CardTemplateRef = {
  id: string;
  name: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  allowedCardType: 'BASIC' | 'COLLECTOR' | null;
};

/** `GET /card-templates` 한 건. 브랜드가 승인한 디자인의 전체 모습. */
export type CardTemplate = CardTemplateRef & {
  brandId: string;
  brandName: string;
  description: string | null;
  /** `resourceData` 를 파싱한 것. 문자열이 깨져 있으면 `null` — 템플릿 자체는 살린다. */
  resource: TemplateResource | null;
};

/**
 * 고객이 만든 커스텀 한 벌. `card_customizations` 한 행.
 *
 * **`frontImageUrl` 이 이 타입의 존재 이유다.** 커스텀이 적용된 카드 앞면은 서버가 합성해
 * 이 주소로 돌려주므로, 편집 화면의 결과물이자 컬렉션에 보이는 얼굴이 된다.
 */
export type CardCustomization = {
  id: string;
  status: string;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  message: string | null;
  createdAt: string;
};

/**
 * 카드 위의 한 칸, **카드 전체를 1로 놓은 좌표계**로.
 *
 * `x`/`y` 는 왼쪽 위 모서리다. 백엔드 스펙은 네 값이 0~1 이라는 것만 말하고 기준점이 어디인지
 * 적지 않았다 — 중심점으로 읽을 수도 있었지만, 왼쪽 위가 CSS·RN·캔버스가 모두 쓰는 규약이고
 * `{0,0,1,1}` 이 "전면"이라는 가장 흔한 값을 자연스럽게 표현한다. **미지수이므로 픽셀 변환을
 * `card-layers.ts` 의 두 함수에만 가둬 두었다** — 뒤집어야 하면 고칠 곳이 그 둘뿐이다.
 *
 * 픽셀은 여기 없다. 화면 폭이 바뀌어도(웹 리사이즈, 회전) 배치가 그대로 살아남고, 서버로
 * 나갈 때 변환이 필요 없는 이유다.
 */
export type Frame = { x: number; y: number; width: number; height: number };

/**
 * 백엔드 `CardLayerRequest.type` 의 여덟 값.
 *
 * 기획 메모에는 일곱으로 적혀 있었지만 실제 enum 은 `BASE_CARD` 를 하나 더 갖고 있다 —
 * 카드 바탕, 즉 템플릿 도안 자체가 놓이는 칸이다.
 */
export type CardLayerType =
  | 'BASE_CARD'
  | 'BACKGROUND'
  | 'PRODUCT'
  | 'BORDER'
  | 'PATTERN'
  | 'DECORATION'
  | 'TEXT'
  | 'FINISH';

/**
 * 편집기가 다루는 레이어 하나.
 *
 * **`zIndex` 가 없는 것이 의도다.** 배열의 순서가 곧 쌓임 순서이고, 보낼 때 `index` 를
 * `zIndex` 로 계산한다. 둘 다 들고 있으면 순서를 바꾸는 코드가 매번 두 곳을 맞춰야 하고,
 * 언젠가 한 곳을 빠뜨린다.
 *
 * `frame` 을 네 값으로 펼치지 않고 묶은 것도 같은 이유다 — 제스처는 사각형을 통째로 옮기는데
 * 도메인이 평평하면 호출부가 넷 중 셋만 갱신하는 버그가 반드시 생긴다. DTO 는 평평하므로
 * 보낼 때 펼친다.
 */
export type CardLayer = {
  /** 클라이언트가 만든다. DTO 의 optional `id` 로 나가 서버가 짝을 맞출 수 있게 한다. */
  id: string;
  type: CardLayerType;
  /** 이 칸의 이름. `COMPOSITION` 이 알려준 이름이 있으면 그것, 없으면 타입 소문자. */
  slot?: string;
  /** 이 칸을 채우는 AI 리소스. `COMPLETED` 인 것만 들어온다. TEXT 와 기본 PRODUCT 는 없다. */
  resourceId?: Uuid;
  frame: Frame;
  /** −360~360. 계약의 범위이고, 보낼 때 접는다. */
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  /** `TEXT` 전용. 2000자까지. */
  text?: string;
  /** 서버로 그대로 넘어가는 `styleData`. 우리가 뜻을 아는 키만 넣는다. */
  style?: Record<string, unknown>;
};

export type Card = {
  id: Uuid;
  cardType: CardType;
  status: CardStatus;
  /** ISO-8601 UTC, as the backend sends it. Convert at the edge of the UI, not in the store. */
  purchaseDate: string;
  issuedAt: string;
  serialNumber: string;
  brand: Brand;
  product: Product;
  store: Store;
  /**
   * 발급 때 이 카드에 붙은 템플릿.
   *
   * 응답에는 처음부터 있었는데 `hydrateCard()` 가 옮기지 않아 화면이 볼 수 없었다. 편집
   * 화면이 "지금 무엇이 적용돼 있는가"를 말하려면 이것이 필요하다.
   */
  template?: CardTemplateRef;
  /**
   * 지금 적용돼 있는 커스텀. 한 번도 꾸미지 않은 카드는 `undefined` 이고, 그건 결함이 아니라
   * 대부분의 카드가 놓인 상태다.
   */
  customization?: CardCustomization;
};

/**
 * What a reward is, and what it is not.
 *
 * It is never Curio's. Every reward belongs to a house, which sets its own thresholds and hosts
 * its own pickup, so a card from one brand never advances another's — that is why `brand` is on
 * the reward itself rather than looked up from whatever card happened to unlock it.
 *
 * `kind` exists because the brief's own examples do not agree with each other: an invitation has
 * nothing to hand over, a benefit is used rather than collected, and goods are picked up in a
 * shop. One screen cannot phrase all three, so the kind decides what the control says.
 */
export type RewardKind = 'EVENT' | 'BENEFIT' | 'GOODS';

/**
 * 세 가지가 실제로 DB 에 있다는 것은 확인됐다 — `rewards.reward_type` 의 CHECK 제약이
 * `PHYSICAL_CARD` `GOODS` `EVENT_INVITATION` `BENEFIT` 네 값을 강제한다 (V6).
 *
 * **다만 API 가 그 값을 내보내지 않는다.** `UnlockTarget.type` 은 `REWARD` 와 `EVENT` 로만
 * 갈리므로, 지금 만들어낼 수 있는 것은 `EVENT` 와 `BENEFIT` 둘뿐이다. `GOODS` 를 지우지 않는
 * 이유는 DB 가 그런 리워드가 존재한다고 말하고 있기 때문이다 — 타입을 줄이면 나중에 필드가
 * 열렸을 때 여기부터 다시 넓혀야 한다. 백엔드에 `rewardType` 을 요청해 둔 상태다.
 */

/**
 * `LOCKED` is the frontend's own state and has no row behind it.
 *
 * The backend writes a `user_rewards` row only once a reward unlocks — before that the reward is
 * a target described by `collection_rewards`, not something the customer holds. The screen has to
 * show both, because a reward nobody can see yet is not a reason to buy anything. The other three
 * are `user_rewards.status` (`CANCELLED` is an operator action with no customer-facing screen, so
 * it is absent until there is one).
 */
export type RewardStatus = 'LOCKED' | 'UNLOCKED' | 'CLAIMED' | 'EXPIRED';

export type Reward = {
  /** 화면이 이 리워드를 부르는 이름. 해금됐으면 `user_rewards` 행의 id, 아니면 대상의 id. */
  id: string;
  /**
   * 수령을 요청할 때 쓰는 id — `user_rewards` 행. **해금된 뒤에만 존재한다.**
   *
   * `id` 와 따로 두는 이유는 잠긴 리워드에도 상세 화면이 있어야 하기 때문이다. 라우팅에
   * 쓸 값은 항상 있어야 하고, 수령에 쓸 값은 있을 때만 있다.
   */
  userRewardId?: string;
  brand: Brand;
  kind: RewardKind;
  status: RewardStatus;
  title: string;
  /**
   * 제목 아래 한 줄 — 하우스의 말로 이게 무엇인지.
   *
   * `rewards.description` 과 `events.description` 이 DB 에는 있는데 어느 DTO 에도 실리지
   * 않는다. 그래서 지금은 비어 있고, 화면은 없을 때 그 줄을 그리지 않는다.
   */
  note?: string;
  /** 이 리워드가 세어지는 공식 컬렉션과, 고객이 어디까지 왔는지. */
  collection: ProductCollection;
  /**
   * 장수로 환산한 진행도.
   *
   * 해금 조건은 퍼센트(`collection_rewards.required_percentage`)지만 고객이 세는 단위는
   * 장이다. `total` 은 컬렉션 전체가 아니라 **이 리워드가 요구하는 만큼**이라, 같은 컬렉션의
   * 두 리워드가 서로 다른 `total` 을 갖는다 — 하나는 일찍 열리고 하나는 끝까지 가는 것이
   * 이 구조의 요점이다.
   */
  progress: number;
  total: number;
  /**
   * `user_rewards.claim_code` — 매장 직원에게 내미는 것.
   *
   * 해금 시점에는 비어 있고, 수령 요청이 채운다. 그래서 이 값의 부재는 "아직 발급받지
   * 않았다"는 뜻이지 오류가 아니다.
   */
  claimCode?: string;
  /** 해금된 시각. ISO-8601 UTC. */
  unlockedAt?: string;
  /**
   * 수령한 시각. `user_rewards.claimed_at` 컬럼은 있으나 DTO 가 내보내지 않아 지금은 비어 있다.
   */
  claimedAt?: string;
  expiresAt?: string;
};
