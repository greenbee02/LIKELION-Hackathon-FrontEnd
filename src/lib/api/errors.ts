import { ApiError } from './client';

/**
 * 실패를 화면이 쓸 수 있는 두 가지로 바꾼다: **모양**과 **문장**.
 *
 * 이 파일이 존재하는 이유는 오류 코드 목록이 한 군데를 빼면 전부 미지수이기 때문이다.
 * 계약서가 코드를 열거한 곳은 카드 발급(`registrations.ts`, 아홉 개, 실측 검증) 하나뿐이고,
 * AI 리소스·compose·커스터마이징·폴더에는 **오류 코드 목록이 스펙에 없다.** 없는 목록에
 * 화면을 걸면 그 화면은 관찰된 적 없는 문자열을 기다리며 영원히 `UNKNOWN` 만 그린다.
 *
 * 그래서 경계를 이렇게 긋는다:
 *
 * - **상태코드가 화면의 모양을 정한다.** 404 는 화면 전체가 빈 상태이고, 409 는 토스트 한
 *   줄이며 화면은 그대로다. 상태코드는 스펙에 있고 HTTP 가 보장한다.
 * - **코드 문자열은 검증된 곳에서만 문장을 정한다.** 지금은 발급뿐이고, 그 특권은
 *   `registrations.ts` 안에 남는다 — 여기로 일반화하면 다른 화면이 없는 코드에 기대게 된다.
 */

/** 화면이 고를 수 있는 실패의 모양. 상태코드에서만 나온다. */
export type FailureShape =
  | 'notFound'
  | 'forbidden'
  | 'conflict'
  | 'invalid'
  | 'offline'
  | 'server'
  | 'unknown';

export function failureShapeOf(e: unknown): FailureShape {
  if (!(e instanceof ApiError)) return 'unknown';
  switch (e.httpStatus) {
    case 0:
      return 'offline';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 400:
    case 422:
      return 'invalid';
    default:
      return e.httpStatus >= 500 ? 'server' : 'unknown';
  }
}

const COPY: Record<FailureShape, { title: string; note: string }> = {
  notFound: { title: '찾을 수 없습니다', note: '삭제되었거나 잘못된 주소입니다.' },
  forbidden: { title: '접근할 수 없습니다', note: '다른 계정의 것일 수 있습니다.' },
  conflict: { title: '이미 처리된 요청입니다', note: '화면을 새로 불러온 뒤 다시 시도해주세요.' },
  invalid: { title: '요청을 처리할 수 없습니다', note: '입력을 다시 확인해주세요.' },
  offline: { title: '연결에 실패했습니다', note: '네트워크 상태를 확인한 뒤 다시 시도해주세요.' },
  server: { title: '문제가 발생했습니다', note: '잠시 후 다시 시도해주세요.' },
  unknown: { title: '문제가 발생했습니다', note: '잠시 후 다시 시도해주세요.' },
};

/** 화면 전체를 차지하는 실패에 쓴다 — `EmptyState` 의 두 줄. */
export const failureCopy = (e: unknown) => COPY[failureShapeOf(e)];

/**
 * 토스트 한 줄.
 *
 * **4xx 일 때만 서버의 문장을 그대로 쓴다.** 검증 실패의 산문은 서버가 우리보다 구체적이고
 * (무엇이 몇 개를 넘었는지 아는 쪽은 서버다), 백엔드가 한국어로 답한다는 것은 실측됐다.
 * 403·404·5xx·네트워크는 우리 문장을 쓴다 — 그 자리의 서버 문구는 프레임워크 기본값일
 * 가능성이 높고, `HTTP 500` 같은 문자열을 고객에게 보여주는 것은 아무 말도 안 하는 것보다
 * 나쁘다.
 */
export function failureMessage(e: unknown): string {
  const shape = failureShapeOf(e);
  if ((shape === 'conflict' || shape === 'invalid') && e instanceof ApiError) {
    const server = e.message.trim();
    if (server && !/^HTTP \d+$/.test(server)) return server;
  }
  return COPY[shape].title;
}

/** 다시 시도가 의미 있는 실패인가. 네트워크와 서버의 나쁜 날만 해당한다. */
export const isTransient = (e: unknown) =>
  failureShapeOf(e) === 'offline' || failureShapeOf(e) === 'server';
