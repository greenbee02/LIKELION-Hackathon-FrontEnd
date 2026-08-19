import { MOCK_CARE_SERVICES } from './mock/care';

/**
 * 케어 서비스 — **엔드포인트가 없어 언제나 목이다.**
 *
 * 이 파일은 `config.ts` 를 import 하지 않는다. 그것이 규칙의 표시다:
 *
 * > 엔드포인트가 있는 기능은 `EXPO_PUBLIC_USE_MOCK` 을 따르고, 엔드포인트가 아예 없는 기능은
 * > 스위치와 무관하게 언제나 목이다.
 *
 * 스위치를 따르게 만들면 실서버 모드에서 이 화면이 통째로 비는데, 서버에 있을 것이 있다가
 * 없는 게 아니라 **처음부터 그런 API 가 없다.** 스위치는 "목이냐 실서버냐"를 고르는 물건이지
 * "화면을 켜냐 마냐"를 고르는 물건이 아니다. 그래서 `grep -L "from './config'" src/lib/*.ts`
 * 가 아직 서버가 없는 영역을 정확히 세어준다.
 *
 * API 가 생기면 이 파일 안에 `USE_MOCK` 분기 한 줄과 `api/care.ts` 하나가 늘 뿐, 화면도
 * 타입도 그대로다.
 *
 * **타입이 `types.ts` 에 없는 것도 같은 이유다.** 그 파일은 백엔드가 실제로 보내는 것의
 * 모양이고, 아직 아무도 보내지 않는 것은 자기 모듈에 산다. 스키마에 컬럼조차 없어서 나중에
 * 생길 DTO 와 맞을 보장도 없다.
 */

export type CareKind = 'REPAIR' | 'CLEANING' | 'AUTHENTICATION' | 'STORAGE';

export type CareService = {
  id: string;
  kind: CareKind;
  title: string;
  description: string;
  /** 맡기고 받기까지 걸리는 날. 접수가 없는 항목(보관 안내)에는 없다. */
  leadTimeDays?: number;
  /**
   * 어디로 가야 하는가.
   *
   * 전화번호도 URL 도 아니고 **문장**이다. 가짜 번호를 `tel:` 로 걸어주는 것보다 어디로 가면
   * 되는지 말로 적는 편이, 지금 이 서비스가 목이라는 사실과 어긋나지 않는다.
   */
  channel: { type: 'STORE' | 'GUIDE'; label: string };
};

const LEAD = 400;

/** 카드 한 장에 딸린 케어 서비스. 지금은 어느 카드든 같은 목록이다. */
export async function fetchCareServices(): Promise<CareService[]> {
  await new Promise((r) => setTimeout(r, LEAD));
  return MOCK_CARE_SERVICES;
}
