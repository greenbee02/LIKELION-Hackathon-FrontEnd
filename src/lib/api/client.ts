import { API_BASE_URL } from '../config';

/**
 * 백엔드의 모양을 아는 유일한 곳: `/api/v1`, `Bearer` 헤더, 성공은 `{data}`, 실패는
 * `{code, message}`. 화면은 이 파일을 직접 부르지 않는다 — store 를 거치므로, 목에서 실서버로
 * 옮겨가도 화면은 다시 쓰지 않는다.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    /** 목이 던지는 오류에는 HTTP 가 없다 — 0 은 "네트워크를 타지 않았다"는 뜻이다. */
    readonly httpStatus: number = 0,
  ) {
    super(message);
  }
}

/**
 * 상태코드를 코드로 승격시키는 표.
 *
 * **화면은 `e.code` 하나만 본다.** 백엔드가 도메인 코드를 주면(`QR_ALREADY_USED`) 그것이
 * 이기고, 안 주면 상태코드가 여기서 안정된 이름을 얻는다. 그러지 않으면 화면마다 "code 를
 * 먼저 보고 없으면 httpStatus 를 본다"는 두 줄이 반복되고, 언젠가 한 곳이 한 줄이 된다.
 *
 * 이 표가 필요한 이유는 **오류 코드 목록이 한 군데를 빼면 전부 미지수**라는 것이다. 계약서가
 * 코드를 열거한 곳은 카드 발급(`registrations.ts`, 아홉 개, 실측) 하나뿐이고, AI 리소스·
 * compose·커스터마이징·컬렉션에는 코드 목록이 없다. 없는 목록에 화면을 걸면 그 화면은 관찰된
 * 적 없는 문자열을 기다리며 영원히 `UNKNOWN` 만 그린다.
 *
 * `401` 이 없는 것은 의도다 — 그건 아래에서 세션을 끊는 사건이지 화면이 읽을 코드가 아니다.
 * `403` 도 세션을 끊지 않는다: 인증은 멀쩡하고 권한만 없으므로, 로그아웃시키면 고객은 자기가
 * 왜 쫓겨났는지 알 수 없게 된다.
 */
const HTTP_FALLBACK: Record<number, string> = {
  400: 'BAD_REQUEST',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  429: 'TOO_MANY_REQUESTS',
};

const codeFor = (body: { code?: string } | null, status: number): string =>
  body?.code ?? HTTP_FALLBACK[status] ?? (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN');

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};


/**
 * 토큰이 더 이상 통하지 않을 때 부를 것 — 실제로는 `AuthProvider.signOut` 이 꽂힌다.
 *
 * **리프레시 토큰이 없기 때문에 필요하다.** 백엔드는 24시간짜리 access token 하나만 주고
 * 갱신 수단이 없으므로, 만료된 토큰으로 할 수 있는 일은 재로그인뿐이다. 화면마다 401 을
 * 처리하는 대신 전송 계층이 한 번 잡아서 세션을 끊는다.
 */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 요청을 보낼 때 토큰이 있었는지 기억해 둔다. 로그인 실패의 401 과 만료의 401 은 같은
  // 상태코드지만 완전히 다른 사건이고, 전자로 세션을 끊으면 로그인 화면이 스스로를 지운다.
  const sentWithToken = accessToken !== null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  // 204 와 빈 본문은 정상이다 — `DELETE /auth/me` 가 그렇게 답한다.
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && sentWithToken) onUnauthorized?.();
    throw new ApiError(
      codeFor(body, res.status),
      body?.message ?? `HTTP ${res.status}`,
      res.status,
    );
  }
  return body?.data as T;
}
