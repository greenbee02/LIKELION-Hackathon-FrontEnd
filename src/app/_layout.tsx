// The weight subpath, not the package root: the root index requires all 22 faces, and importing
// it drags every one of them into the bundle for the sake of a single wordmark.
import { TitilliumWeb_700Bold } from '@expo-google-fonts/titillium-web/700Bold';
import { useFonts } from 'expo-font';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider, useAuth } from '@/lib/auth-store';
import { CardsProvider } from '@/lib/cards-store';

/** The splash stays up until the stored session has been read and the wordmark face has loaded. */
void SplashScreen.preventAutoHideAsync();

/** Routes reachable without a session. Everything else redirects to /sign-in. */
const PUBLIC_SEGMENTS = new Set(['sign-in', 'sign-up', 'oauth']);

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
  const ready = status !== 'restoring' && fontsReady;

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync();

    const onPublicRoute = PUBLIC_SEGMENTS.has(segments[0] as string);
    if (status === 'signed-out' && !onPublicRoute) router.replace('/sign-in');
    else if (status === 'signed-in' && onPublicRoute) router.replace('/');
  }, [ready, status, segments, router]);

  // Nothing renders until both are settled: the splash is still covering the window, and the
  // wordmark must not appear in the system font for a frame before swapping.
  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  // Only the wordmark uses this face — see src/theme/typography.ts. `error` counts as ready so a
  // font that fails to load degrades to the system font instead of hanging on the splash.
  const [fontsLoaded, fontError] = useFonts({ TitilliumWeb_700Bold });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <CardsProvider>
            <ToastProvider>
              <SessionGate fontsReady={fontsLoaded || Boolean(fontError)}>
                <Stack screenOptions={{ headerShown: false }} />
              </SessionGate>
              <PortalHost />
            </ToastProvider>
          </CardsProvider>
        </AuthProvider>
      </SafeAreaProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
