import { request } from './client';

/**
 * 리워드 — 백엔드가 두 리스트로 나눠 주고, 프론트가 합친다.
 *
 * 나눠져 있는 것은 설계상 그렇다. 해금되기 전의 리워드는 아직 아무 행도 없는 **조건**이고
 * (`collection_rewards`), 해금된 뒤에야 고객의 것이 된다 (`user_rewards`). 두 리스트는 그
 * 경계선의 양쪽이다. 합치는 일은 `src/lib/rewards.ts` 가 한다.
 */

/** 해금 대상 하나. `type` 은 `rewards` 행인지 `events` 행인지를 가른다. */
export type UnlockTarget = {
  type: 'REWARD' | 'EVENT';
  id: string;
  name: string;
  /** `collection_rewards.required_percentage` — 컬렉션의 몇 %를 모아야 열리는지. */
  requiredPercentage: number;
  unlocked: boolean;
};

/**
 * 공식 컬렉션 하나의 달성 현황.
 *
 * 분모가 컬렉션의 전체 상품 수가 아니라 `requiredProductCount` 인 점이 중요하다 —
 * `product_collection_items.is_required` 가 참인 상품만 달성률에 들어간다(운영 정책).
 */
export type RewardProgressResponse = {
  collectionId: string;
  collectionName: string;
  requiredProductCount: number;
  ownedRequiredProductCount: number;
  percentage: number;
  targets: UnlockTarget[];
};

/**
 * 이미 해금된 것. 해금 전에는 이 목록에 아예 나타나지 않는다 — 실측으로 확인했다.
 *
 * `id` 는 리워드의 id 가 아니라 **`user_rewards` 행의 id** 다. 수령 요청이 이걸 요구한다.
 */
export type UserRewardResponse = {
  id: string;
  targetType: 'REWARD' | 'EVENT';
  targetId: string;
  name: string;
  status: 'UNLOCKED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  claimCode: string | null;
  unlockedAt: string;
  expiresAt: string | null;
};

export const fetchRewardProgress = () => request<RewardProgressResponse[]>('/rewards/progress');

export const fetchMyRewards = () => request<UserRewardResponse[]>('/rewards/my');

/**
 * 수령 코드를 **발급받는다**. 조회가 아니라 생성이다.
 *
 * `user_rewards.claim_code` 는 해금 시점에 비어 있고 이 요청이 채운다. 그래서 코드 화면은
 * 이미 있는 값을 보여주는 화면이 아니라, 버튼을 눌러야 코드가 생기는 화면이다 — 매장 앞에서
 * 꺼내는 물건이라는 성격과도 맞다.
 *
 * 매장 직원이 확인하고 `CLAIMED` 로 바꾸는 API 는 아직 없다(직원 도메인 부재, 운영 정책 문서).
 * 즉 코드 발급까지가 지금의 끝이다.
 */
export const claimReward = (userRewardId: string) =>
  request<UserRewardResponse>(`/rewards/${userRewardId}/claim`, { method: 'POST' });
