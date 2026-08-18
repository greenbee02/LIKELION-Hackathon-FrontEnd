import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, CameraOff, ScanLine } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors, scaleAlpha } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The scan tab.
 *
 * Four modes, one screen. The camera is the product's path — a receipt in one hand and a phone in
 * the other — but it is not the only one that has to work: **React Native Web and the simulator
 * have no camera**, and the demo runs in a browser, so manual entry is a first-class route rather
 * than a fallback buried behind an error. On web it is simply the screen.
 *
 * This screen never judges a token. Everything it finds — scanned or typed — goes to
 * `/issue/[token]`, which owns the round trip and every way it can end. A scanner that reported
 * "invalid code" would need its own copy of four error branches to do it.
 */
type Mode = 'loading' | 'intro' | 'denied' | 'camera' | 'manual';

/** `expo-camera`'s web barcode support depends on a browser API that is not everywhere. */
const CAMERA_AVAILABLE = Platform.OS !== 'web';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(!CAMERA_AVAILABLE);
  const [token, setToken] = useState('');

  /**
   * A camera fires `onBarcodeScanned` many times a second while a code is in frame. Without this
   * the customer gets a stack of issuance screens for one receipt. Reset on focus, so coming back
   * from the issuance screen makes the scanner live again.
   */
  const handled = useRef(false);
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
    }, []),
  );

  const issue = useCallback(
    (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value) return;
      router.push({ pathname: '/issue/[token]', params: { token: value } });
    },
    [router],
  );

  const mode: Mode = manual
    ? 'manual'
    : !CAMERA_AVAILABLE || !permission
      ? 'loading'
      : permission.granted
        ? 'camera'
        : permission.canAskAgain
          ? 'intro'
          : 'denied';

  if (mode === 'manual') {
    return (
      <Screen scroll>
        <Text variant="title" style={styles.headline}>
          코드 직접 입력
        </Text>
        <Text variant="body" tone="muted" style={styles.support}>
          영수증에 인쇄된 코드를 입력하면 카드가 발급됩니다.
        </Text>

        <Input
          label="영수증 코드"
          required
          value={token}
          onChangeText={setToken}
          placeholder="MCM-DEMO-2026-001"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => issue(token)}
          style={styles.field}
        />

        <Button
          label="카드 발급받기"
          disabled={!token.trim()}
          onPress={() => issue(token)}
          style={styles.submit}
        />

        {CAMERA_AVAILABLE ? (
          <TextLink label="카메라로 스캔하기" onPress={() => setManual(false)} style={styles.link} />
        ) : null}
      </Screen>
    );
  }

  if (mode === 'camera') {
    return (
      <Screen gutter={false}>
        <View style={styles.viewfinder}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              issue(data);
            }}
          />

          {/* No full-screen scrim: darkening the frame would fight the one job the camera has.
              The guide rides its own translucent pill instead, and the brackets are gray 1 —
              near-white, which is the only thing that holds over an unknown scene. */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.guide}>
              <Text variant="label" tone="inverted">
                영수증의 QR 코드를 사각형 안에 맞춰주세요
              </Text>
            </View>

            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Glass, per the convention for anything floating over content: near-white and crisp,
              edged by a hairline, so the label on it reads at step 12 like everywhere else. */}
          <BlurView intensity={40} tint="light" style={styles.bar}>
            <Text variant="caption" tone="muted" style={styles.barNote}>
              코드를 찾으면 자동으로 발급됩니다
            </Text>
            <TextLink label="코드 직접 입력" onPress={() => setManual(true)} />
          </BlurView>
        </View>
      </Screen>
    );
  }

  if (mode === 'loading') {
    return <Screen><View style={styles.body} /></Screen>;
  }

  const denied = mode === 'denied';

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.badge}>
          {denied ? (
            <CameraOff size={28} color={colors.text} />
          ) : (
            <ScanLine size={28} color={colors.text} />
          )}
        </View>
        <Text variant="title" style={styles.headline}>
          {denied ? '카메라 권한이 꺼져 있습니다' : '영수증 QR을 스캔하세요'}
        </Text>
        <Text variant="body" tone="muted" style={styles.support}>
          {denied
            ? '설정에서 Curio의 카메라 접근을 허용하면 스캔할 수 있습니다. 지금은 코드를 직접 입력해 발급할 수 있습니다.'
            : '구매하신 영수증의 QR 코드를 읽어 카드를 발급합니다. 카메라는 스캔할 때만 사용합니다.'}
        </Text>
      </View>

      <View style={styles.footer}>
        {denied ? (
          <Button label="설정 열기" onPress={() => void Linking.openSettings()} />
        ) : (
          <Button
            label="카메라 사용 허용"
            leading={<Camera size={20} color={colors.textInverted} />}
            onPress={() => void requestPermission()}
          />
        )}
        <TextLink label="코드 직접 입력" onPress={() => setManual(true)} style={styles.link} />
      </View>
    </Screen>
  );
}

/**
 * ⚠️ LOCAL — the plain link the auth screens spell out inline: a pressable that is not a button,
 * at step 11 so it never competes with the one control the screen wants pressed. It appears four
 * times here, which is three more than is worth repeating. Promote to `src/components/ui/` if a
 * third screen wants it.
 */
function TextLink({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.textLink, pressed && styles.textLinkPressed, style]}
    >
      <Text variant="label" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

/** The viewfinder square, big enough that a receipt QR fills it at arm's length. */
const FRAME = 240;
const CORNER = 28;

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  headline: { marginTop: space[5], textAlign: 'center' },
  support: { marginTop: space[2], textAlign: 'center' },
  footer: { paddingBottom: space[5] },
  field: { marginTop: space[6] },
  submit: { marginTop: space[5] },
  link: { alignSelf: 'center', marginTop: space[3] },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  /** Gray 12 as a fill, the role a dark surface uses — visible only until the preview starts. */
  viewfinder: { flex: 1, backgroundColor: colors.solidStrong, overflow: 'hidden' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    backgroundColor: scaleAlpha.grayA11,
    borderRadius: radius.full,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    marginBottom: space[5],
  },
  frame: { width: FRAME, height: FRAME },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.background,
  },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.base },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.base },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.base },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.base },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: space[4],
    paddingBottom: space[5],
    paddingHorizontal: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: scaleAlpha.grayA6,
  },
  barNote: { marginBottom: space[1] },
  textLink: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.base,
  },
  textLinkPressed: { backgroundColor: colors.surface },
});
