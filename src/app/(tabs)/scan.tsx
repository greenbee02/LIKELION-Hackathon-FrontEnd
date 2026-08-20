import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The scan tab: a bar, the camera, and a line saying what to do with it.
 *
 * The camera runs full width, which is the only element in the app allowed past the gutter — it
 * is a window onto the room rather than a picture placed on the page, and a 16pt margin around a
 * live scene reads as a photograph of one.
 *
 * **It is a square, not the leftover height.** A viewfinder stretched to fill the page puts the
 * aiming mark at the middle of the window, which is where the hand holding the phone cannot
 * comfortably reach past — and it makes the frame taller than anything it will ever read, since a
 * QR code is square. Fixing the ratio pulls the whole scene up under the bar and leaves the
 * bottom of the screen empty, which is the thumb's half of the phone.
 *
 * This screen never judges a token. Whatever it reads goes straight to `/issue/[token]`, which
 * owns the round trip and every way it can end — a scanner that reported "invalid code" would
 * need its own copy of four error branches, and two copies drift.
 *
 * **There is no web branch.** `expo-camera` depends on `barcode-detector`, a wasm ponyfill it
 * falls back to wherever the browser has no `BarcodeDetector` of its own, so the same code reads
 * a QR code in Chrome as it does on a phone. The one thing the browser insists on is a secure
 * context — `localhost` qualifies, a LAN address over plain http does not, so a phone browser
 * pointed at the dev server is the one place the preview stays dark.
 */

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  // The tab bar floats over the page, so this screen pays for the overlap itself.
  const tabBarSpace = useTabBarSpace();

  /**
   * **A tab is never unmounted.** Moving to 컬렉션, or pushing 발급 over this screen, leaves the
   * scanner mounted with its capture session open — which is what kept iOS's green indicator lit
   * while the customer was looking at something else entirely. So focus, not mounting, decides
   * whether the camera exists: everything below hangs off `live`, and unmounting the preview is
   * what actually closes the session, on every platform rather than only the one with an
   * `active` prop.
   *
   * It sits beside `useFocusEffect` below rather than replacing it, because the two answer
   * different questions — this one is read during render, that one runs the reset once per
   * arrival. A reset written as a plain effect would be a `setState` inside an effect body.
   */
  const focused = useIsFocused();

  /**
   * Asked for on arrival rather than behind a button: the customer pressed a tab called 스캔 to
   * get here, so a second "may we?" control in front of the camera asks the same question twice.
   * `canAskAgain` going false is what stops this repeating.
   */
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  /**
   * A camera fires `onBarcodeScanned` many times a second while a code is in frame; without this
   * one receipt stacks up a pile of issuance screens. Released whenever focus returns, so coming
   * back from an issuance makes the viewfinder live again. The torch is reset with it because the
   * lamp went out with the session, and a control that says 켜짐 over a dark lamp is a lie.
   */
  const handled = useRef(false);
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setTorch(false);
    }, []),
  );

  const live = Boolean(permission?.granted) && focused;

  /** `permission` 이 null 인 동안은 아직 거절당한 것이 아니라 답을 기다리는 중이다. */
  const cameraBlocked = permission !== null && !permission.granted;

  return (
    /* 이 화면이 처음 쓰던 줄이고, 이제는 뒤로 가기가 있는 모든 화면이 같은 것을 쓴다.
       `gutter={false}` 여도 헤더 슬롯이 양옆 여백을 주므로 여기서 감쌀 것이 없다. */
    <Screen gutter={false} header={<NavBar title="코드 스캔" fallback="/" />}>
      <View style={styles.stage}>
        {live ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              const token = data.trim().toUpperCase();
              /* 잠그는 것은 **보낼 것이 있을 때만**이다. 빈 코드에도 잠가버리면 그 뒤로는
                 진짜 영수증을 비춰도 아무 일이 일어나지 않고, 푸는 방법은 탭을 떠났다
                 돌아오는 것뿐이다. */
              if (!token) return;
              handled.current = true;
              router.push({ pathname: '/issue/[token]', params: { token } });
            }}
          />
        ) : null}

        {/* Small, and centred: it marks where to aim rather than boxing off a region the scanner
            enforces — the decoder reads the whole frame, and a large bracket that suggests
            otherwise makes people hold the receipt further away than they need to.

            Gray 1 is the one value that holds over a scene nobody has seen yet, which is the same
            reason the alpha scale exists for edges over photographs. */}
        {live ? (
          <View style={styles.reticle} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        ) : null}

        {/* Glass, per the convention for anything floating over content: near-white and crisp, so
            the icon on it reads at step 12 like everywhere else in the app. */}
        {live ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? '플래시 끄기' : '플래시 켜기'}
            accessibilityState={{ selected: torch }}
            onPress={() => setTorch((on) => !on)}
            style={({ pressed }) => [styles.torch, pressed && styles.torchPressed]}
          >
            <BlurView intensity={40} tint="light" style={styles.torchInner}>
              {torch ? (
                <Zap size={20} color={colors.text} />
              ) : (
                <ZapOff size={20} color={colors.text} />
              )}
            </BlurView>
          </Pressable>
        ) : null}
      </View>

      {/* 뷰파인더 밑의 한 줄은 이 화면이 지금 무엇을 시키는지를 말한다. 카메라가 없으면
          겨냥하라는 안내는 거짓말이 되므로, 같은 자리에서 다음에 할 일로 바뀐다 — 권한이
          없다는 사실만 알리는 것은 상태 보고이고, 이 자리는 늘 다음 동작을 말해왔다.
          아래에 한 줄을 더 붙이면 화면이 두 가지를 동시에 시키게 된다.

          권한이 아직 정해지지 않은 동안(`permission` 이 null)은 기본 문구를 둔다. 허용된
          기기에서도 첫 프레임 전에 권한을 허용하라는 말이 한 번 스쳤다 사라지는 편이 더 나쁘다.

          문구는 muted 11 이 아니라 12 다. 막힌 상태를 푸는 줄은 안내가 아니라 답이고,
          색은 쓰지 않는다 — 이 앱의 유일한 색은 point 이며 오류의 것이 아니다. */}
      <View style={styles.guide}>
        <Text
          variant="caption"
          tone={cameraBlocked ? 'default' : 'muted'}
          style={styles.guideText}
        >
          {cameraBlocked
            ? 'QR 코드를 스캔하려면 카메라 권한을 허용해주세요.'
            : 'QR 코드를 화면 중앙에 스캔하면 카드가 발급됩니다'}
        </Text>
      </View>

      {/* 뷰파인더가 더 이상 남는 높이를 다 먹지 않으므로, 남는 높이는 여기가 갖는다. 탭 바가
          이 화면 위에 떠 있어서 최소 높이만큼은 반드시 비어 있어야 한다 — 작은 화면에서
          `flex` 가 0으로 눌려도 안내 문구가 탭 바 밑으로 들어가지 않는다. */}
      <View style={[styles.rest, { minHeight: tabBarSpace }]} />
    </Screen>
  );
}

/** The aiming mark: a 56pt square drawn only at its corners. */
const RETICLE = 56;
const ARM = 14;

const styles = StyleSheet.create({
  /** Surface fill, so the frame is a shape on the page even before a preview arrives — or when
      one never does, on a device without a camera. Square because the code is: `aspectRatio` ties
      the height to whatever width the device gives, so nothing here is a guessed number. */
  stage: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface, overflow: 'hidden' },

  reticle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: RETICLE,
    height: RETICLE,
    marginTop: -RETICLE / 2,
    marginLeft: -RETICLE / 2,
  },
  corner: { position: 'absolute', width: ARM, height: ARM, borderColor: colors.background },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: radius.small },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: radius.small },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: radius.small },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: radius.small },

  torch: { position: 'absolute', top: space[4], right: space[4], borderRadius: radius.full, overflow: 'hidden' },
  torchPressed: { opacity: 0.7 },
  torchInner: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  guide: { paddingHorizontal: space[4], paddingVertical: space[4] },
  rest: { flex: 1 },
  guideText: { textAlign: 'center' },
});
