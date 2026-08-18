import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, setAccessToken } from './api/client';
import { fetchMe, login as loginRequest, signup as signupRequest, type AuthUser } from './api/auth';

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

/** Flip to false once the backend is reachable; nothing above this file changes. */
const USE_MOCK = true;

/**
 * Development bypass. `true` starts the app already signed in, so the screens built after this
 * one are not gated behind a login on every reload. It must be false in anything demoed.
 */
const SKIP_AUTH = false;

const TOKEN_KEY = 'curio.auth.accessToken';

const MOCK_USER: AuthUser = { id: 'u1', email: 'demo@curio.app', nickname: 'Demo' };

type AuthValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** A request is in flight — the submit button shows a spinner. */
  pending: boolean;
  /** The last failure, in the user's language, ready to sit under the form. */
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  /**
   * The social path. While `USE_MOCK` holds it mints the same session the email path does, so a
   * demo can walk the whole product from one tap; once the real flow lands, only this function
   * changes — it opens `/oauth2/authorization/{provider}`, waits for the redirect back on the
   * `curio://` scheme, and trades the one-shot code through `POST /auth/oauth/exchange`.
   */
  signInWithProvider: (provider: SocialProvider) => Promise<boolean>;
  signUp: (email: string, password: string, nickname: string) => Promise<boolean>;
  signOut: () => Promise<void>;
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
      if (SKIP_AUTH) {
        if (alive) {
          setUser(MOCK_USER);
          setStatus('signed-in');
        }
        return;
      }

      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!alive) return;
        if (!token) {
          setStatus('signed-out');
          return;
        }

        setAccessToken(token);
        // A stored token proves nothing — it may have expired while the app was closed.
        const me = USE_MOCK ? MOCK_USER : await fetchMe();
        if (!alive) return;
        setUser(me);
        setStatus('signed-in');
      } catch {
        if (!alive) return;
        setAccessToken(null);
        await AsyncStorage.removeItem(TOKEN_KEY);
        setStatus('signed-out');
      }
    };

    void restore();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
    setStatus('signed-in');
  }, []);

  const signIn = useCallback<AuthValue['signIn']>(
    async (email, password) => {
      setPending(true);
      setError(null);
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 600));
          await persist('mock-token', { ...MOCK_USER, email });
        } else {
          const tokens = await loginRequest(email, password);
          setAccessToken(tokens.accessToken);
          await persist(tokens.accessToken, await fetchMe());
        }
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

  const signInWithProvider = useCallback<AuthValue['signInWithProvider']>(
    async (provider) => {
      setPending(true);
      setError(null);
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 600));
          await persist('mock-token', { ...MOCK_USER, email: `demo.${provider}@curio.app` });
          return true;
        }
        // No OAuth round trip yet — see dev/active/scope-vs-backend.md §1 on the redirect scheme.
        setError('소셜 로그인은 준비 중입니다.');
        return false;
      } catch (e) {
        setError(messageFor(e));
        return false;
      } finally {
        setPending(false);
      }
    },
    [persist],
  );

  const signUp = useCallback<AuthValue['signUp']>(
    async (email, password, nickname) => {
      setPending(true);
      setError(null);
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 600));
          await persist('mock-token', { ...MOCK_USER, email, nickname });
        } else {
          const tokens = await signupRequest(email, password, nickname);
          setAccessToken(tokens.accessToken);
          await persist(tokens.accessToken, await fetchMe());
        }
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
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setError(null);
    setStatus('signed-out');
  }, []);

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
      clearError: () => setError(null),
    }),
    [status, user, pending, error, signIn, signInWithProvider, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
