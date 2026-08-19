import { BRANDS } from './cards';
import type { Reward } from '../types';

/**
 * Stand-in rewards. There is no API for these at all — `rewards`, `events`, `collection_rewards`
 * and `user_rewards` are tables with seed data and no controller (scope §5-5).
 *
 * Written fresh rather than copied from the backend's seed, because two of its three rewards were
 * a physical card and a holder for one, and the physical card left the product on 2026-08-19.
 *
 * **The numbers agree with `MOCK_CARDS`.** Women's Signature holds two of the four cards the
 * customer has, so that reward is open; Seoul Exclusive holds one of four, so its top reward is
 * not. A demo where the progress bars disagree with the grid one tab away is a demo that gets
 * counted and caught.
 *
 * Seoul Exclusive carries two rewards at different thresholds, and that is the point of it being
 * here twice: `collection_rewards.required_percentage` is a percentage per reward, not per
 * collection, so one set can open a small benefit early and hold its real prize back for the last
 * card. That is the mechanic the whole loop rests on, and one reward per collection would hide it.
 *
 * Only MCM appears, because the customer holds no Atelier cards. A reward from a house you have
 * never bought from is not an incentive, it is an advertisement — the same reason the collection
 * screen hides its brand filter until a second house is actually in the grid.
 */
export const MOCK_REWARDS: Reward[] = [
  {
    id: 'r1',
    brand: BRANDS.mcm,
    kind: 'EVENT',
    status: 'UNLOCKED',
    title: '26FW 런웨이 초대',
    note: '서울 쇼룸에서 열리는 프리뷰에 동반 1인과 입장하실 수 있습니다.',
    collection: { id: 'womens-signature', name: "Women's Signature" },
    progress: 2,
    total: 2,
    claimCode: 'MCM-7842-XQPT',
    expiresAt: '2026-10-31T14:59:00Z',
  },
  {
    id: 'r2',
    brand: BRANDS.mcm,
    kind: 'BENEFIT',
    status: 'CLAIMED',
    title: '프리미엄 케어 1회',
    note: '구매하신 제품의 클리닝과 컨디션 점검을 매장에서 받으실 수 있습니다.',
    collection: { id: 'seoul-exclusive', name: 'Seoul Exclusive' },
    progress: 1,
    total: 4,
    claimCode: 'MCM-3106-BNWQ',
    unlockedAt: '2026-07-18T02:00:00Z',
    claimedAt: '2026-07-20T05:12:00Z',
  },
  {
    id: 'r3',
    brand: BRANDS.mcm,
    kind: 'GOODS',
    status: 'LOCKED',
    title: '서울 익스클루시브 키링',
    note: '서울 한정 컬렉션을 모두 모으신 분께 매장에서 드립니다.',
    collection: { id: 'seoul-exclusive', name: 'Seoul Exclusive' },
    progress: 1,
    total: 4,
  },
  {
    id: 'r4',
    brand: BRANDS.mcm,
    kind: 'BENEFIT',
    status: 'LOCKED',
    title: '퍼스널 스타일링 세션',
    note: '시즌 신상 컬렉션 3장부터 스타일리스트와의 1:1 세션이 열립니다.',
    collection: { id: 'aw26-new', name: '2026 New Arrivals' },
    progress: 1,
    total: 3,
  },
];
