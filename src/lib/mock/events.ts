import type { BrandEvent } from '../events';

/**
 * 하우스가 여는 행사 — 목.
 *
 * `events` 테이블은 마이그레이션(V6)에 실재하므로 **컬럼 모양을 그대로 흉내낸다.** 나중에
 * 컨트롤러가 생기면 이 타입은 대체로 맞을 것이고, 화면은 그대로 둔 채 소스만 갈아끼우면 된다.
 *
 * 날짜는 고정 문자열이다. 상대 시각(`오늘 + 30일`)으로 만들면 시연을 언제 하느냐에 따라 카피가
 * 달라지고, 지난 행사가 되어버리는 날이 온다. 시연 전에 여기 네 줄을 고치는 편이 낫다.
 */
export const MOCK_EVENTS: BrandEvent[] = [
  {
    id: 'evt-preview-26fw',
    brandId: 'mcm',
    brandName: 'MCM',
    title: '26FW 컬렉션 프리뷰',
    description:
      '정식 출시 전 26FW 라인을 먼저 보시는 자리입니다. 컬렉션을 만든 팀이 직접 소개하고, 원하시면 그 자리에서 예약하실 수 있습니다.',
    eventType: 'PREVIEW',
    startAt: '2026-09-12T11:00:00Z',
    endAt: '2026-09-12T14:00:00Z',
    location: '청담 플래그십 2층',
    capacity: 40,
    appliedCount: 31,
  },
  {
    id: 'evt-leather-class',
    brandId: 'mcm',
    brandName: 'MCM',
    title: '가죽 관리 클래스',
    description:
      '가지고 계신 가죽 제품을 직접 들고 오시면, 소재에 맞는 손질법을 익히고 그 자리에서 한 번 손봐 드립니다.',
    eventType: 'CLASS',
    startAt: '2026-09-20T14:00:00Z',
    endAt: '2026-09-20T16:00:00Z',
    location: '명동점 케어 라운지',
    capacity: 12,
    appliedCount: 12,
  },
  {
    id: 'evt-seoul-private',
    brandId: 'mcm',
    brandName: 'MCM',
    title: 'Seoul Exclusive 프라이빗 나이트',
    description:
      '서울 한정 컬렉션을 모으고 계신 분들을 위한 저녁 자리입니다. 신청해 주시면 하우스가 검토 후 초대장을 보내드립니다.',
    eventType: 'PRIVATE_INVITATION',
    startAt: '2026-10-04T18:30:00Z',
    endAt: '2026-10-04T21:00:00Z',
    location: '청담 플래그십 루프탑',
    capacity: 20,
    appliedCount: 9,
  },
];
