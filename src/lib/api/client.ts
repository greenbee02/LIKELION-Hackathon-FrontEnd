/**
 * The one place that knows the backend's shape: `/api/v1`, a Bearer header, `{data}` on success
 * and `{code, message}` on failure. Screens never touch this — they go through the store, so a
 * screen moves from mock to live without being rewritten.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(body?.code ?? 'UNKNOWN', body?.message ?? `HTTP ${res.status}`);
  }
  return body?.data as T;
}
