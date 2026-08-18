import { BlurView } from 'expo-blur';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The scan tab: a title, the camera, and a line saying what to do with it.
 *
 * The camera runs full width between the two, which is the only element in the app allowed past
 * the gutter — it is a window onto the room rather than a picture placed on the page, and a 16pt
 * margin around a live scene reads as a photograph of one.
 *
 * Two ways in, because a receipt is not always in the hand: the camera reads a code in front of
 * it, and 앨범 reads one out of a screenshot. The second is also the only path that works on the
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
    <Screen gutter={false}>
      {/* Gutter by hand: the screen drops it so the camera can run edge to edge, and the two
          text blocks put it back. The back arrow falls through to the collection rather than a
          fixed route — at a tab's root there is no history to return to. */}
      <View style={styles.header}>
        <BackButton fallback="/" />
        <Text variant="title" style={styles.title}>
          스캔
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

        {live ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? '플래시 끄기' : '플래시 켜기'}
            accessibilityState={{ selected: torch }}
            onPress={() => setTorch((on) => !on)}
            style={styles.torch}
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

        {/* Glass, per the convention for anything floating over content: near-white and crisp,
            edged by a hairline, so its label reads at step 12 like everywhere else in the app. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickFromLibrary()}
          style={({ pressed }) => [styles.album, pressed && styles.albumPressed]}
        >
          <BlurView intensity={40} tint="light" style={styles.albumInner}>
            <ImageIcon size={18} color={colors.text} />
            <Text variant="label" style={styles.albumLabel}>
              앨범
            </Text>
          </BlurView>
        </Pressable>
      </View>

      <View style={styles.guide}>
        <Text variant="caption" tone="muted" style={styles.guideText}>
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
  header: { paddingTop: space[2], paddingHorizontal: space[4] },
  title: { marginTop: space[4] },
  /** Surface fill, so the frame is a shape on the page even before a preview arrives — or when
      one never does, on a device without a camera. */
  stage: { flex: 1, marginTop: space[5], backgroundColor: colors.surface, overflow: 'hidden' },

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

  guide: { paddingHorizontal: space[4], paddingVertical: space[4] },
  guideText: { textAlign: 'center' },
});
