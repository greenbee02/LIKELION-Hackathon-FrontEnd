import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The scan tab.
 *
 * One square, held in the page rather than filling it. A full-bleed viewfinder is what a scanner
 * app looks like, and this is not one — scanning is a step inside a product about cards, so the
 * camera is sized like any other element on the screen and the gutter runs past it unbroken.
 *
 * This screen never judges a token. Whatever the camera reads goes straight to `/issue/[token]`,
 * which owns the round trip and every way it can end. A scanner that reported "invalid code"
 * would need its own copy of four error branches, and two copies drift.
 */

/** `expo-camera`'s web barcode support rides a browser API that is not everywhere. */
const CAMERA_AVAILABLE = Platform.OS !== 'web';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  /**
   * Asked for on arrival rather than behind a button. The screen has one purpose and the customer
   * pressed a tab called 스캔 to get here, so a second "may we?" control in front of the camera
   * would be a step that asks the same question twice.
   *
   * `canAskAgain` is what stops this repeating: once the OS says no permanently it goes false and
   * the effect stands down.
   */
  useEffect(() => {
    if (!CAMERA_AVAILABLE || !permission) return;
    if (!permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  /**
   * A camera fires `onBarcodeScanned` many times a second while a code is in frame. Without this
   * one receipt would stack up a pile of issuance screens. Released on focus, so coming back from
   * an issuance makes the square live again.
   */
  const handled = useRef(false);
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
    }, []),
  );

  const live = CAMERA_AVAILABLE && Boolean(permission?.granted);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">스캔</Text>
        <Text variant="body" tone="muted" style={styles.support}>
          영수증의 QR 코드를 사각형 안에 맞춰주세요
        </Text>
      </View>

      {/* Square, always — the frame is part of the page's layout, so it must not resize when the
          preview arrives or fail to appear when it never does. Without a camera it simply stays
          the surface fill it started as. */}
      <View style={styles.square}>
        {live ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              const token = data.trim().toUpperCase();
              if (!token) return;
              router.push({ pathname: '/issue/[token]', params: { token } });
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** The same top rhythm the collection header sits on, so the two tabs start on one line. */
  header: { paddingTop: space[2] },
  support: { marginTop: space[2] },
  square: {
    width: '100%',
    aspectRatio: 1,
    marginTop: space[5],
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
