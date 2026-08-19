import { ApiError } from './api/client';
import { MOCK_EVENTS } from './mock/events';
import type { Card } from './types';

/**
 * 브랜드 행사 — **엔드포인트가 없어 언제나 목이다.**
 *
 * `care.ts` 와 같은 이유로 이 파일도 `config.ts` 를 import 하지 않는다:
 *
 * > 엔드포인트가 있는 기능은 `EXPO_PUBLIC_USE_MOCK` 을 따르고, 엔드포인트가 아예 없는 기능은
 * > 스위치와 무관하게 언제나 목이다.
 *
 * `events` 테이블은 DB 에 실재하고 시드도 들어 있지만 **컨트롤러가 없다.** OpenAPI 의 경로
 * 27개를 전부 확인했고 `/events` 로 시작하는 것은 하나도 없다. 리워드 쪽 `UnlockTarget.type`
 * 이 `EVENT` 를 갖고 있어 **초대형 리워드는 실데이터로 들어오지만**, 그것은 "당신이 이 초대를
 * 받았다"는 사실이지 "이런 행사가 열린다"가 아니다. 둘은 다른 것이라 리워드 화면에서도
 * 헤딩으로 갈라 놓는다.
 *
 * 신청은 상태가 남아야 하므로 배열이 아니라 작은 서버다 — 모듈이 신청 목록을 들고, 정원이
 * 찼거나 이미 신청했으면 진짜 `ApiError` 를 던진다.
 */

export type EventType = 'PREVIEW' | 'CLASS' | 'PRIVATE_INVITATION' | 'POPUP';

export type BrandEvent = {
  id: string;
  brandId: string;
  brandName: string;
  title: string;
  description: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  appliedCount: number;
};

/** 신청한 행사 → 신청 번호. 세션 동안만 산다. */
const applications = new Map<string, string>();
let sequence = 0;

const LEAD = 500;

/**
 * 왜 이 행사가 당신에게 보이는가.
 *
 * 보유 카드에서 근거를 찾는다 — 같은 도시에서 산 적이 있는지, 그 하우스의 카드를 갖고 있는지.
 * **이것도 AI 가 아니고 그렇게 부르지 않는다.** 근거를 문장으로 돌려주므로 화면은 추천이라는
 * 말 대신 그 문장을 적을 수 있다.
 */
export function reasonFor(event: BrandEvent, cards: Card[]): string | null {
  const sameBrand = cards.filter((c) => c.brand.id === event.brandId);
  if (sameBrand.length === 0) return null;

  const leather = sameBrand.some((c) => c.product.material?.includes('레더'));
  if (event.eventType === 'CLASS' && leather) return '가죽 제품을 갖고 계셔서';

  const seoul = sameBrand.some((c) => c.store.city === 'Seoul');
  if (seoul && event.location.includes('청담')) return '서울에서 구매하신 적이 있어서';
  if (seoul && event.location.includes('명동')) return '서울에서 구매하신 적이 있어서';

  return `${event.brandName} 카드를 ${sameBrand.length}장 갖고 계셔서`;
}

export async function fetchEvents(): Promise<BrandEvent[]> {
  await new Promise((r) => setTimeout(r, LEAD));
  return MOCK_EVENTS.map((e) => ({ ...e, appliedCount: e.appliedCount + (applications.has(e.id) ? 1 : 0) }));
}

export async function fetchEvent(id: string): Promise<BrandEvent> {
  const found = (await fetchEvents()).find((e) => e.id === id);
  if (!found) throw new ApiError('EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  return found;
}

export function applicationOf(eventId: string): string | undefined {
  return applications.get(eventId);
}

/**
 * 신청한다. 정원이 찼으면 거절한다.
 *
 * **확정이 아니라 신청이다.** 프라이빗 초대는 하우스가 검토 후 정하고, 정원이 있는 자리는
 * 우선 신청일 뿐이다. 화면의 카피가 "신청 완료"이지 "참석 확정"이 아닌 이유다.
 */
export async function applyToEvent(eventId: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600));

  const already = applications.get(eventId);
  if (already) return already;

  const event = MOCK_EVENTS.find((e) => e.id === eventId);
  if (!event) throw new ApiError('EVENT_NOT_FOUND', '행사를 찾을 수 없습니다.');
  if (event.appliedCount >= event.capacity) {
    throw new ApiError('EVENT_FULL', '신청이 마감되었습니다.');
  }

  sequence += 1;
  const code = `APP-${String(sequence).padStart(4, '0')}`;
  applications.set(eventId, code);
  return code;
}

export async function cancelApplication(eventId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  applications.delete(eventId);
}
