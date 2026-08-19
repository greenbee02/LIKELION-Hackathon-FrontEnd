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

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/**
 * 이미지 때문에 필요하다.
 *
 * 백엔드가 상품 사진을 `/images/**` 아래에 두고 인증을 걸어놨는데(permitAll 목록에 빠져 있다),
 * `<Image>` 는 헤더를 자동으로 붙이지 않는다. 네이티브는 `source={{uri, headers}}` 로 실어
 * 보낼 수 있으므로 그 한 곳에서만 이 값을 꺼내 쓴다 — 전송 계층 밖으로 토큰이 새는 유일한
 * 구멍이고, `/images/**` 가 열리면 같이 사라진다.
 */
export const getAccessToken = () => accessToken;

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
    throw new ApiError(body?.code ?? 'UNKNOWN', body?.message ?? `HTTP ${res.status}`, res.status);
  }
  return body?.data as T;
}
