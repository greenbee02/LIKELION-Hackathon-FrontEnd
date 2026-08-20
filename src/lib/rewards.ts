import {
  fetchMyRewards,
  fetchRewardProgress,
  type RewardProgressResponse,
  type UnlockTarget,
  type UserRewardResponse,
} from './api/rewards';
import { fetchCollectionIndex, type CollectionIndex } from './api/product-collections';
import { colors } from '@/theme/colors';
import type { Reward, RewardKind, RewardProduct, RewardStatus } from './types';

/**
 * 백엔드의 두 리스트를 화면 하나가 읽는 목록으로 합친다.
 *
 * `/rewards/progress` 는 **아직 열리지 않은 것까지 포함한 조건 전부**를, `/rewards/my` 는
 * **이미 열린 것만** 준다. 리워드 화면이 존재하는 이유가 잠긴 리워드를 보여주는 데 있으므로
 * (이미 받은 것은 영수증이고, 두 장 남은 것이 세 번째 카드를 살 이유다) 두 목록이 다 필요하고,
 * 잠긴 쪽에는 붙일 행이 없어 프론트가 조인해야 한다.
 *
 * 조인 키는 `UserRewardResponse.targetId` ↔ `UnlockTarget.id`.
 */

/**
 * 퍼센트 조건을 장수로 바꾼다.
 *
 * 고객은 퍼센트로 세지 않는다. 조건이 66.67% 이고 필수 상품이 3개면 그건 "2장"이고,
 * 화면에는 그렇게 적혀야 한다. 올림하는 이유는 66.67% 가 2장을 **넘겨야** 한다는 뜻이 아니라
 * 2장으로 **닿는다**는 뜻이기 때문이다 — 2/3 = 66.67%.
 *
 * **그런데 그대로 올리면 3장이 나온다.** `required_percentage` 는 NUMERIC(5,2) 라 2/3 이
 * 66.6666… 이 아니라 66.67 로 저장되고, 66.67% × 3 = 2.0001 이며, 올림은 그 0.0001 을
 * 한 장으로 센다. 화면에는 "3장 중 0장"과 "모두 모으면 열립니다"가 뜨는데 실제로는 두 장이면
 * 열린다 — 하우스가 만든 포스터가 "필수 상품 3개 중 2개"라고 적고 있으니 화면이 그 옆에서
 * 다른 말을 하고 있었던 셈이다.
 *
 * 그래서 **올리기 전에 소수 셋째 자리에서 정리한다.** 2 자리 반올림이 만드는 오차는 상품
 * 100개까지도 0.005 를 넘지 못하므로 이 정리가 진짜 조건을 지우는 일은 없고, 반대로 정말
 * 2.01 장을 요구하는 조건(67% × 3)은 그대로 3장으로 남는다.
 */
function requiredCards(target: UnlockTarget, requiredProductCount: number): number {
  const exact = (target.requiredPercentage / 100) * requiredProductCount;
  const needed = Math.ceil(Number(exact.toFixed(3)));
  // 조건이 0%보다 크다는 것은 DB 가 보장하므로(V6 CHECK), 최소 한 장은 있어야 열린다.
  return Math.max(1, needed);
}

/**
 * `EVENT` 는 확실하고, 나머지는 `BENEFIT` 으로 둔다.
 *
 * `rewards.reward_type` 이 굿즈와 혜택과 실물 카드를 구분하지만 API 가 그 값을 내보내지
 * 않는다. 없는 근거로 셋을 가르느니 둘로 정확히 가르는 편이 낫다 — 잘못된 CTA 는 없는 CTA
 * 보다 나쁘다. `rewardType` 이 열리면 이 함수 한 줄이 늘어난다.
 */
const kindOf = (type: UnlockTarget['type']): RewardKind =>
  type === 'EVENT' ? 'EVENT' : 'BENEFIT';

const statusOf = (mine: UserRewardResponse | undefined): RewardStatus =>
  mine ? (mine.status as RewardStatus) : 'LOCKED';

/**
 * 컬렉션을 채우는 필수 상품들, 화면 순서대로.
 *
 * `is_required` 가 아닌 상품은 달성률에 들어가지 않으므로(운영 정책) 여기서도 뺀다 — 세는
 * 것과 보여주는 것이 다르면 그림이 진행도를 거짓말한다.
 */
function requiredProducts(index: CollectionIndex, collectionId: string): RewardProduct[] {
  return (index.byCollection.get(collectionId) ?? [])
    .filter((item) => item.required)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item) => ({
      id: item.product.id,
      name: item.product.name,
      imageUrl: item.product.imageUrl ?? null,
    }));
}

function toReward(
  entry: RewardProgressResponse,
  target: UnlockTarget,
  mine: UserRewardResponse | undefined,
  index: CollectionIndex,
): Reward {
  const total = requiredCards(target, entry.requiredProductCount);
  // 이 리워드에 대한 진행도는 이 리워드가 요구하는 만큼에서 멈춘다. 컬렉션을 다 모은 뒤에도
  // 일찍 열린 리워드가 "5/2장"으로 보이면 그건 진행도가 아니라 계산식 노출이다.
  const progress = Math.min(entry.ownedRequiredProductCount, total);
  const collection = index.byId.get(entry.collectionId);

  return {
    id: mine?.id ?? target.id,
    userRewardId: mine?.id,
    brand: {
      id: collection?.brandId ?? 'unknown',
      name: collection?.brandName ?? '',
      accent: colors.solid,
      logoUrl: null,
    },
    kind: kindOf(target.type),
    status: statusOf(mine),
    title: mine?.name ?? target.name,
    collection: {
      id: entry.collectionId,
      name: entry.collectionName,
      // 리워드 목록의 색이 이 값에서 나온다. 색인이 없으면 색도 없다 — `collection-accents.ts`.
      theme: collection?.theme ?? null,
    },
    products: requiredProducts(index, entry.collectionId),
    progress,
    total,
    claimCode: mine?.claimCode ?? undefined,
    unlockedAt: mine?.unlockedAt,
    expiresAt: mine?.expiresAt ?? undefined,
  };
}

/**
 * 리워드 목록 전부, 잠긴 것 포함.
 *
 * **`CANCELLED` 는 목록에서 뺀다.** 브랜드가 거둬들인 리워드이므로 만료로 보여주면 이유를
 * 잘못 말하는 것이고, 잠긴 것으로 보여주면 이제 열리지 않을 것을 사라고 권하는 셈이 된다.
 * 아무 말도 하지 않는 것이 정확하다.
 */
export async function fetchRewards(): Promise<Reward[]> {
  const [progress, mine, index] = await Promise.all([
    fetchRewardProgress(),
    fetchMyRewards(),
    fetchCollectionIndex(),
  ]);

  const byTarget = new Map(mine.map((m) => [m.targetId, m]));
  const rewards: Reward[] = [];
  // 하나의 리워드가 두 컬렉션에 걸릴 수 있다(`collection_rewards` 는 대상당 여러 행을 허용).
  // 화면에 같은 것이 두 번 나오지 않도록 처음 만난 쪽만 남긴다.
  const seen = new Set<string>();

  for (const entry of progress) {
    for (const target of entry.targets) {
      if (seen.has(target.id)) continue;
      const row = byTarget.get(target.id);
      if (row?.status === 'CANCELLED') continue;
      seen.add(target.id);
      rewards.push(toReward(entry, target, row, index));
    }
  }

  return rewards;
}
