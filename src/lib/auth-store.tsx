import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, setAccessToken, setUnauthorizedHandler } from './api/client';
import {
  deleteMe,
  fetchMe,
  login as loginRequest,
  signup as signupRequest,
  type AuthUser,
} from './api/auth';

/**
 * Who is signed in, and whether we are still finding out.
 *
 * `restoring` is the state that makes this a mobile app rather than a web page: the token lives
 * on the device, so the first frame after launch cannot know yet whether to show the collection
 * or the sign-in screen. The splash screen stays up for exactly that window — see src/app/_layout.
 */
export type AuthStatus = 'restoring' | 'signed-out' | 'signed-in';

/** The backend exposes google and kakao; apple is the one to request when these get wired. */
export type SocialProvider = 'google' | 'apple';

const TOKEN_KEY = 'curio.auth.accessToken';
/**
 * 토큰이 언제 죽는지. 리프레시가 없어서 따로 적어둬야 한다 — JWT 를 열어보면 알 수 있지만,
 * 그러자고 전송 계층에 디코더를 들이는 것보다 서버가 말해준 `expiresInSeconds` 를 저장하는
 * 편이 정직하다.
 */
const EXPIRY_KEY = 'curio.auth.expiresAt';

type AuthValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** A request is in flight — the submit button shows a spinner. */
  pending: boolean;
  /** The last failure, in the user's language, ready to sit under the form. */
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  /**
   * The social path. Not wired yet — it will open `/oauth2/authorization/{provider}`, wait for
   * the redirect back on the `curio://` scheme, and trade the one-shot code through
   * `POST /auth/oauth/exchange`. Until then it reports that, rather than minting a session.
   */
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /**
   * `DELETE /auth/me` — a soft withdrawal: the backend stamps `deleted_at` rather than dropping
   * the row, because the cards are issued against purchases that still happened.
   *
   * It ends in the same place `signOut` does, and on purpose: whether the server accepted the
   * deletion or the network dropped it, the session on this device is gone and the customer is
   * back at the door. An account that is deleted server-side but still signed in locally is the
   * one outcome that would be worse than either.
   */
  withdraw: () => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Backend error codes are machine-readable and terse; the form shows these instead. */
function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'INVALID_CREDENTIALS':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'EMAIL_ALREADY_EXISTS':
        return '이미 가입된 이메일입니다.';
      default:
        return e.message;
    }
  }
  return '연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session restore: one read of the device, then a decision. Runs once, on launch.
  useEffect(() => {
    let alive = true;

    const restore = async () => {
      try {
        const [token, expiresAt] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(EXPIRY_KEY),
        ]);
        if (!alive) return;
        if (!token) {
          setStatus('signed-out');
          return;
        }

        // 만료는 네트워크를 타기 전에 판정한다. 리프레시가 없으므로 만료된 토큰으로 할 수
        // 있는 일이 없고, 그렇다면 요청을 한 번 보내 401 을 받아보는 것은 대기 시간만 쓰는
        // 일이다. 문 앞에서 되돌리는 편이 빠르고, 화면이 깜빡이지 않는다.
        if (expiresAt && Number(expiresAt) <= Date.now()) {
          await AsyncStorage.multiRemove([TOKEN_KEY, EXPIRY_KEY]);
          if (alive) setStatus('signed-out');
          return;
        }

        setAccessToken(token);
        // 저장된 토큰은 아무것도 증명하지 않는다 — 서버가 계정을 지웠을 수도 있다.
        const me = await fetchMe();
        if (!alive) return;
        setUser(me);
        setStatus('signed-in');
      } catch {
        if (!alive) return;
        setAccessToken(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, EXPIRY_KEY]);
        setStatus('signed-out');
      }
    };

    void restore();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(
    async (token: string, nextUser: AuthUser, expiresInSeconds: number) => {
      setAccessToken(token);
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000)],
      ]);
      setUser(nextUser);
      setStatus('signed-in');
    },
    [],
  );

  const signIn = useCallback<AuthValue['signIn']>(
    async (email, password) => {
      setPending(true);
      setError(null);
      try {
        // 로그인 응답이 사용자까지 준다 — `/auth/me` 를 이어 부를 이유가 없다.
        const session = await loginRequest(email, password);
        await persist(session.accessToken, session.user, session.expiresInSeconds);
        return true;
      } catch (e) {
        setError(messageFor(e));
        return false;
      } finally {
        setPending(false);
      }
    },
    [persist],
  );

  /* OAuth 왕복이 아직 없다 — `dev/active/backend-open-items.md` 의 리다이렉트 스킴 문제.
     그래서 이 함수는 아무 데도 다녀오지 않고 그 사실만 말한다. */
  const signInWithProvider = useCallback<AuthValue['signInWithProvider']>(async () => {
    setError('소셜 로그인은 준비 중입니다.');
    return false;
  }, []);

  const signUp = useCallback<AuthValue['signUp']>(
    async (email, password, name) => {
      setPending(true);
      setError(null);
      try {
        // 가입은 계정만 만들고 토큰을 주지 않는다. 세션은 곧바로 이어지는 로그인이 연다 —
        // 화면은 이미 두 값을 들고 있으므로 고객에게는 한 번의 제출로 보인다.
        await signupRequest(email, password, name);
        const session = await loginRequest(email, password);
        await persist(session.accessToken, session.user, session.expiresInSeconds);
        return true;
      } catch (e) {
        setError(messageFor(e));
        return false;
      } finally {
        setPending(false);
      }
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    setAccessToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, EXPIRY_KEY]);
    setUser(null);
    setError(null);
    setStatus('signed-out');
  }, []);

  /**
   * 서버가 토큰을 거절하면 세션을 끊는다.
   *
   * 리프레시 토큰이 없기 때문에 이게 유일한 복구 경로다 — 만료됐거나 서버가 계정을 지웠다면
   * 갱신할 방법이 없고, 앱이 할 수 있는 일은 문으로 되돌리는 것뿐이다. 화면마다 401 을
   * 처리하는 대신 전송 계층이 한 번 잡아 여기로 올린다.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const withdraw = useCallback<AuthValue['withdraw']>(async () => {
    setPending(true);
    setError(null);
    try {
      await deleteMe();
      await signOut();
      return true;
    } catch (e) {
      setError(messageFor(e));
      return false;
    } finally {
      setPending(false);
    }
  }, [signOut]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      pending,
      error,
      signIn,
      signInWithProvider,
      signUp,
      signOut,
      withdraw,
      clearError: () => setError(null),
    }),
    [status, user, pending, error, signIn, signInWithProvider, signUp, signOut, withdraw],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
