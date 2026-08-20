import { request } from './client';

/**
 * `/auth` 아래 다섯 개. 실제 서버(`http://1.201.117.14`)에 요청해 확인한 모양이다 —
 * 자세한 내용은 `dev/active/backend-contract.md` §1.
 */

/**
 * `UserResponse`. 백엔드의 `users` 테이블은 `name` 을 갖고 있고 `nickname` 이라는 컬럼은
 * 없다 — V1 마이그레이션 기준이다. 프론트가 한동안 `nickname` 으로 부르던 것이 이것이다.
 */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  /** `users.role`. 지금은 화면을 가르지 않지만, 매장 직원 도메인이 생기면 여기서 갈린다. */
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
};

/**
 * 로그인이 돌려주는 것 전부.
 *
 * **리프레시 토큰이 없다.** 백엔드는 24시간짜리 access token 하나만 주고 갱신 엔드포인트가
 * 없으므로, 만료는 재로그인으로만 풀린다. `expiresInSeconds` 를 받아 만료 시각으로 저장해
 * 두는 이유가 그것이다 — 만료된 토큰으로 화면을 그린 뒤 첫 요청에서 401 을 맞는 것보다,
 * 복원 단계에서 문 앞으로 되돌리는 편이 낫다.
 *
 * `user` 를 같이 주므로 로그인 직후에 `GET /auth/me` 를 이어 부를 필요가 없다.
 */
export type AuthSession = {
  accessToken: string;
  user: AuthUser;
  expiresInSeconds: number;
};

export const login = (email: string, password: string) =>
  request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

/**
 * **가입은 토큰을 주지 않는다.** `201` 과 `UserResponse` 로 끝나므로, 세션을 얻으려면
 * `login` 을 이어 불러야 한다. 회원가입 화면은 이미 이메일과 비밀번호를 들고 있으니 화면이
 * 달라질 일은 없고, 그 연결은 `auth-store` 가 한다.
 */
export const signup = (email: string, password: string, name: string) =>
  request<AuthUser>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

/**
 * 백엔드가 리다이렉트로 넘긴 1회용 코드를 JWT 로 바꾼다. 유효기간 2분, 한 번만 쓸 수 있어
 * 교환에 실패하면 재시도가 아니라 OAuth 왕복 전체를 다시 시작해야 한다.
 */
export const exchangeOAuthCode = (code: string) =>
  request<AuthSession>('/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

export const fetchMe = () => request<AuthUser>('/auth/me');

/**
 * 소프트 탈퇴 — `users.deleted_at` 에 도장을 찍는다.
 *
 * **다만 서버가 그 도장을 읽지 않는다.** `AuthService.login()` 이 `deleted_at IS NULL` 을
 * 거르지 않아서 탈퇴한 계정으로 로그인이 그대로 된다 (실측). 프론트가 할 수
 * 있는 일은 없고, 로컬 세션을 확실히 끊는 것이 이 상황에서 할 수 있는 전부다.
 */
export const deleteMe = () => request<void>('/auth/me', { method: 'DELETE' });
