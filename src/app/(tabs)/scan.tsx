import { BlurView } from 'expo-blur';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The scan tab.
 *
 * A viewfinder is one of the few screens in this app that is dark, and that is not a theme — it is
 * the surround of a live camera, filled with `solidStrong` the same way a solid button is. Light
 * chrome around a moving image reads as a bright frame the eye keeps returning to, and the one
 * thing that should hold attention here is the scene the customer is aiming at.
 *
 * Two ways in, because a receipt is not always in the hand: the camera reads a code in front of
 * it, and 앨범 reads one out of a screenshot. The second is also the only way this works on the
 * web, where there is no camera but `scanFromURLAsync` still runs.
 *
 * This screen never judges a token. Whatever it reads goes straight to `/issue/[token]`, which
 * owns the round trip and every way it can end — a scanner that reported "invalid code" would
 * need its own copy of four error branches, and two copies drift.
 */
const CAMERA_AVAILABLE = Platform.OS !== 'web';

export default function ScanScreen() {
  const router = useRouter();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);

  /**
   * Asked for on arrival rather than behind a button: the customer pressed a tab called 스캔 to
   * get here, so a second "may we?" control in front of the camera asks the same question twice.
   * `canAskAgain` going false is what stops this repeating.
   */
  useEffect(() => {
    if (!CAMERA_AVAILABLE || !permission) return;
    if (!permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  /**
   * A camera fires `onBarcodeScanned` many times a second while a code is in frame; without this
   * one receipt stacks up a pile of issuance screens. Released on focus, so coming back from an
   * issuance makes the viewfinder live again.
   */
  const handled = useRef(false);
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setTorch(false);
    }, []),
  );

  const issue = useCallback(
    (raw: string) => {
      const token = raw.trim().toUpperCase();
      if (!token) return;
      router.push({ pathname: '/issue/[token]', params: { token } });
    },
    [router],
  );

  const pickFromLibrary = useCallback(async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
    if (picked.canceled) return;

    const uri = picked.assets[0]?.uri;
    if (!uri) return;

    try {
      const [found] = await scanFromURLAsync(uri, ['qr']);
      if (!found) {
        toast('이미지에서 QR 코드를 찾지 못했습니다');
        return;
      }
      handled.current = true;
      issue(found.data);
    } catch {
      toast('이미지를 읽지 못했습니다');
    }
  }, [issue, toast]);

  const live = CAMERA_AVAILABLE && Boolean(permission?.granted);

  return (
    <Screen gutter={false} style={styles.screen}>
      <View style={styles.header}>
        <Text variant="heading" tone="inverted">
          코드 스캔
        </Text>
      </View>

      <View style={styles.stage}>
        {live ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (handled.current) return;
              handled.current = true;
              issue(data);
            }}
          />
        ) : null}

        {/* Small, and centred: it marks where to aim rather than boxing off a region the scanner
            actually enforces — the decoder reads the whole frame, and a large bracket that
            suggests otherwise makes people hold the receipt further away than they need to. */}
        {live ? (
          <View style={styles.reticle} pointerEvents="none">
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        ) : null}

        {live ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? '플래시 끄기' : '플래시 켜기'}
            accessibilityState={{ selected: torch }}
            onPress={() => setTorch((on) => !on)}
            style={styles.torch}
          >
            <BlurView intensity={30} tint="dark" style={styles.torchInner}>
              {torch ? (
                <Zap size={20} color={colors.textInverted} />
              ) : (
                <ZapOff size={20} color={colors.textInverted} />
              )}
            </BlurView>
          </Pressable>
        ) : null}

        {/* Glass, but dark — the convention says a floating surface is near-white, and that holds
            over the app's own light content. Over a live scene a near-white bar blows out the
            thing it floats on, so here the same glass is tinted the other way. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickFromLibrary()}
          style={({ pressed }) => [styles.album, pressed && styles.albumPressed]}
        >
          <BlurView intensity={30} tint="dark" style={styles.albumInner}>
            <ImageIcon size={18} color={colors.textInverted} />
            <Text variant="label" tone="inverted" style={styles.albumLabel}>
              앨범
            </Text>
          </BlurView>
        </Pressable>
      </View>

      <View style={styles.guide}>
        <Text variant="caption" tone="inverted" style={styles.guideText}>
          영수증의 QR 코드를 스캔하거나 앨범에서 QR 이미지를 올려보세요
        </Text>
      </View>
    </Screen>
  );
}

/** The aiming mark: a 56pt square drawn only at its corners. */
const RETICLE = 56;
const ARM = 14;

const styles = StyleSheet.create({
  /** Gray 12 as a fill — the role a solid surface uses, not a second theme. */
  screen: { backgroundColor: colors.solidStrong },
  header: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  stage: { flex: 1, overflow: 'hidden' },

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
  torchInner: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  album: {
    position: 'absolute',
    bottom: space[5],
    alignSelf: 'center',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  albumPressed: { opacity: 0.7 },
  albumInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  albumLabel: { marginLeft: space[2] },

  guide: { paddingHorizontal: space[4], paddingVertical: space[5] },
  guideText: { textAlign: 'center' },
});
