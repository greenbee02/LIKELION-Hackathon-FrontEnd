/** Mirrors the backend's `CardResponse`, plus `brand` — see dev/active/scope-vs-backend.md §5-1. */

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

export type Card = {
  id: string;
  cardType: CardType;
  status: CardStatus;
  /** ISO-8601 UTC, as the backend sends it. Convert at the edge of the UI, not in the store. */
  purchaseDate: string;
  issuedAt: string;
  serialNumber: string;
  brand: Brand;
  product: Product;
  store: Store;
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
