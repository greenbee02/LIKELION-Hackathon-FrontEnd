import type { CareService } from '../care';

/**
 * 케어 서비스 목록 — 목.
 *
 * **이 영역만은 흉내낼 컬럼조차 없다.** 다른 목들은 실제 테이블의 모양을 따라 지었지만
 * (`collections`, `events` 는 마이그레이션에 실재한다), 수선·클리닝 서비스는 스키마 어디에도
 * 없다. 그래서 이 타입은 나중에 생길 DTO 와 맞을 보장이 없고, 그 사실을 `care.ts` 가 주석으로
 * 안고 있다.
 *
 * **연락처는 가짜다. 그래서 화면이 그것을 누를 수 있게 만들지 않는다.** 없는 번호로 전화를
 * 걸어주는 버튼은 기능이 아니라 함정이다.
 */
export const MOCK_CARE_SERVICES: CareService[] = [
  {
    id: 'care-repair',
    kind: 'REPAIR',
    title: '수선',
    description:
      '스티치 풀림, 손잡이 마모, 지퍼 교체처럼 오래 쓰며 생기는 것들을 하우스의 공방이 맡습니다. 보증 기간 안이면 대부분 무상입니다.',
    leadTimeDays: 14,
    channel: { type: 'STORE', label: '구매하신 매장에서 접수' },
  },
  {
    id: 'care-cleaning',
    kind: 'CLEANING',
    title: '클리닝',
    description:
      '가죽과 캔버스를 소재에 맞는 방식으로 세척하고 보호제를 다시 입힙니다. 계절이 바뀔 때 한 번이면 충분합니다.',
    leadTimeDays: 7,
    channel: { type: 'STORE', label: '구매하신 매장에서 접수' },
  },
  {
    id: 'care-authentication',
    kind: 'AUTHENTICATION',
    title: '정품 확인',
    description:
      '카드에 새겨진 시리얼로 하우스가 발행 기록을 대조해 드립니다. 중고로 넘기거나 물려줄 때 필요합니다.',
    channel: { type: 'STORE', label: '매장 방문 시 카드 제시' },
  },
  {
    id: 'care-storage',
    kind: 'STORAGE',
    title: '보관 안내',
    description:
      '더스트백에 넣어 서늘하고 건조한 곳에 세워 보관하세요. 눌린 채로 오래 두면 형태가 돌아오지 않습니다.',
    channel: { type: 'GUIDE', label: '별도 접수 없이 참고하실 내용입니다' },
  },
];
