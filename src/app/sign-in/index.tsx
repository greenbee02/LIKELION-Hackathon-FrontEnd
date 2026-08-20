import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppleMark } from '@/components/brand-marks/apple';
import { GoogleMark } from '@/components/brand-marks/google';
import { appleButton } from '@/components/brand-marks/palettes';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { Wordmark } from '@/components/ui/wordmark';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * The door.
 *
 * The layout is the one every commerce app has trained its customers on: wordmark alone in the
 * upper third, the social buttons stacked in the middle, and one plain link underneath for
 * everyone else. Nothing else is on the screen — no tagline, no illustration — because the only
 * question it asks is which account you already have.
 *
 * The two email links briefly collapsed into one while the copy was English, where the labels ran
 * nearly the full width and read as a wall of near-identical words. In Korean they are five
 * characters each and the row breathes, so both destinations are back on the door.
 *
 * The wordmark carries the top on its own deliberately: this is the one screen in the app that
 * belongs to Curio rather than to a house whose cards it holds, so it is the only place the
 * product says its own name at size.
 *
 * There is no back arrow. This is where the app starts — there is nothing behind it.
 */
export default function SignInScreen() {
  const { signInWithProvider, pending, error, clearError } = useAuth();
  const toast = useToast();
  const router = useRouter();

  /**
   * There is no OAuth round trip behind this yet, and no session is minted in its place — the
   * store answers that the provider is not ready and the screen says so. The email path is the
   * way in until the redirect scheme lands.
   */
  const continueWithGoogle = async () => {
    const ok = await signInWithProvider('google');
    if (ok) router.replace('/');
  };

  /**
   * **실패는 `auth-store` 의 `error` 에 들어가고, 이 화면에는 그것을 그릴 자리가 없었다.**
   *
   * 그래서 구글 버튼은 눌러도 아무 일이 없는 컨트롤이었다 — 바로 옆의 애플 버튼은 같은
   * 사실을 토스트로 말하고 있었으니, 같은 화면의 두 버튼이 같은 상황에 다르게 답한 셈이다.
   * OAuth 가 실제로 연결된 뒤에도 이 줄은 그대로 쓸모가 있다: 그때는 진짜 실패가 여기로 온다.
   */
  useEffect(() => {
    if (!error) return;
    toast(error);
    clearError();
  }, [error, clearError, toast]);

  // Apple stays a stub. The backend exposes google and kakao; Apple is required alongside any
  // social provider on iOS (App Store guideline 4.8) and is what to ask the backend for next.
  const notReady = () => toast('소셜 로그인은 준비 중입니다');

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      {/* Ratios rather than fixed offsets: the wordmark should sit at the same point of a small
          phone and a large one, and a hardcoded top margin only lands on the device it was
          measured against. */}
      <View style={styles.hero}>
        <Wordmark />
      </View>

      <View style={styles.body}>
        <Button
          label="구글로 로그인"
          variant="outline"
          leading={<GoogleMark />}
          onPress={continueWithGoogle}
          loading={pending}
        />
        {/* Apple's own black button. Google's guidelines describe the white one, which is what
            `outline` already is, so the two providers end up looking as different as they are
            meant to. */}
        <Button
          label="애플로 로그인"
          palette={appleButton}
          leading={<AppleMark color={appleButton.foreground} />}
          onPress={notReady}
          style={styles.stacked}
        />

        {/* Two destinations, equal weight, either side of a rule — neither is the other's
            fallback, so neither is styled as a button. Smaller and at step 11 rather than 12 —
            two steps down from the buttons above, so the fast way in stays the loudest thing on
            the screen. Step 11 is the lightest a word is allowed to be and still clears AA. */}
        <View style={styles.emailRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-up')}
            style={({ pressed }) => [styles.emailLink, pressed && styles.emailLinkPressed]}
          >
            <Text variant="label" tone="muted">이메일 가입</Text>
          </Pressable>

          <View style={styles.emailDivider} />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-in/email')}
            style={({ pressed }) => [styles.emailLink, pressed && styles.emailLinkPressed]}
          >
            <Text variant="label" tone="muted">이메일 로그인</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** The upper ~36% of the screen, with the wordmark centred in it — so it lands near a fifth down. */
  hero: { flex: 36, alignItems: 'center', justifyContent: 'center' },
  /** The rest. Content sits at the top of it and the remainder stays empty on purpose. */
  body: { flex: 64 },
  stacked: { marginTop: space[3] },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space[4],
  },
  emailLink: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.base,
  },
  emailLinkPressed: { backgroundColor: colors.surface },
  /** Step 6 — the separator that should barely register, not the step-7 border of a real edge. */
  emailDivider: { width: StyleSheet.hairlineWidth, height: 12, backgroundColor: colors.borderSubtle },
});
