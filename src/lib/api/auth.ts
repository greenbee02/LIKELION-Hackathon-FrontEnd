import { request } from './client';

/**
 * The five endpoints under `/auth`. See dev/active/scope-vs-backend.md §1.
 *
 * The backend documents which endpoints exist but not what their success bodies hold, so the
 * shapes below are the minimum the screens need. Widen them against the real response the first
 * time this runs live rather than guessing more fields now.
 */

export type AuthUser = {
  id: string;
  email: string;
  nickname: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export const login = (email: string, password: string) =>
  request<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const signup = (email: string, password: string, nickname: string) =>
  request<AuthTokens>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, nickname }),
  });

/**
 * Exchanges the one-shot code the backend redirects with for a JWT. Valid for two minutes and
 * usable once — a failed exchange cannot be retried, the whole OAuth round trip has to restart.
 */
export const exchangeOAuthCode = (code: string) =>
  request<AuthTokens>('/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

export const fetchMe = () => request<AuthUser>('/auth/me');

/** Soft withdrawal. */
export const deleteMe = () => request<void>('/auth/me', { method: 'DELETE' });
