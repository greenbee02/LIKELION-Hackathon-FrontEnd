// The weight subpath, not the package root: the root index requires all 22 faces, and importing
// it drags every one of them into the bundle for the sake of a single wordmark.
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { TitilliumWeb_700Bold } from '@expo-google-fonts/titillium-web/700Bold';
import { useFonts } from 'expo-font';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider, useAuth } from '@/lib/auth-store';
import { CardsProvider } from '@/lib/cards-store';
import { CollectionsProvider } from '@/lib/collections-store';
import { onboardingSnapshot, primeOnboarding, subscribeOnboarding } from '@/lib/onboarding';

/** The splash stays up until the stored session has been read and the wordmark face has loaded. */
void SplashScreen.preventAutoHideAsync();

/** Routes reachable without a session. Everything else redirects to /sign-in. */
const PUBLIC_SEGMENTS = new Set(['sign-in', 'sign-up', 'oauth', 'onboarding']);

/**
 * The session gate.
 *
 * The first screen of a mobile app is not a screen — it is a decision. A returning customer has a
 * token on the device and should land in their collection without ever seeing the sign-in form;
 * a new one should never see a tab bar. Both cases resolve here, under the splash, so neither
 * flashes the wrong screen on the way.
 */
function SessionGate({ children, fontsReady }: { children: ReactNode; fontsReady: boolean }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  /* 저장소가 아니라 모듈을 구독한다 — 온보딩 화면이 "봤다"고 적는 순간 이 게이트가 알아야
     하고, 그러지 않으면 로그인 화면으로 나가자마자 다시 온보딩으로 끌려온다. */
  const onboarded = useSyncExternalStore(subscribeOnboarding, onboardingSnapshot, onboardingSnapshot);

  useEffect(() => {
    void primeOnboarding();
  }, []);

  /* 셋이 다 정해지기 전에는 아무것도 그리지 않는다. 스플래시가 아직 창을 덮고 있고, 여기서
     한 프레임이라도 새면 그 프레임에 틀린 화면이 보인다. */
  const ready = status !== 'restoring' && fontsReady && onboarded !== null;

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();

    const segment = segments[0] as string;
    const onPublicRoute = PUBLIC_SEGMENTS.has(segment);

    /* 소개가 로그인보다 먼저다. 아직 아무것도 사지 않은 사람에게 계정부터 요구하면 무엇을
       위한 계정인지 알 수 없다. 이미 로그인된 사람에게는 해당 없음 — 그 사람에게 이 앱은
       처음이 아니다. */
    if (status === 'signed-out' && !onboarded && segment !== 'onboarding') {
      router.replace('/onboarding');
    } else if (status === 'signed-out' && onboarded && !onPublicRoute) {
      router.replace('/sign-in');
    } else if (status === 'signed-in' && onPublicRoute) {
      router.replace('/');
    }
  }, [ready, status, onboarded, segments, router]);

  // Nothing renders until both are settled: the splash is still covering the window, and the
  // wordmark must not appear in the system font for a frame before swapping.
  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  // Only the wordmark uses this face — see src/theme/typography.ts. `error` counts as ready so a
  // font that fails to load degrades to the system font instead of hanging on the splash.
  const [fontsLoaded, fontError] = useFonts({ TitilliumWeb_700Bold, CormorantGaramond_600SemiBold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* 토스트가 store 보다 바깥에 있는 이유: `CollectionsProvider` 의 뒤늦은 동기화가
            실패하면 그 사실을 말해야 하는데, 안쪽에 있으면 store 가 토스트를 부를 수 없다.
            화면이 이미 다른 곳으로 넘어간 뒤에 실패가 도착하므로 화면이 대신 말해줄 수도
            없다 — 그때 조용히 되돌리는 것이 "담은 카드가 1초 뒤 사라진다"의 정체였다. */}
        <ToastProvider>
          <AuthProvider>
            <CardsProvider>
              <CollectionsProvider>
                <SessionGate fontsReady={fontsLoaded || Boolean(fontError)}>
                  <Stack screenOptions={{ headerShown: false }} />
                </SessionGate>
                <PortalHost />
              </CollectionsProvider>
            </CardsProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
