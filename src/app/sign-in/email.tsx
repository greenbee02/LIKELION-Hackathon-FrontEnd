import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * The long way in, one tap behind the door.
 *
 * No wordmark here: the customer has already read it on the screen they came from, and repeating
 * it would make this look like a second entrance rather than a step inside the first.
 *
 * Account recovery hangs off the bottom of this screen. Signing up does not: that branch has its
 * own link on the door, and mixing "make an account" into a row about recovering one asks the
 * customer to sort out which of their situations applies while they are already stuck.
 */
export default function EmailSignInScreen() {
  const { signIn, pending, error, clearError } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  // Validated on submit, not on every keystroke: a field that turns invalid while it is still
  // being typed into is telling the customer they are wrong before they have finished.
  const emailError = touched && !EMAIL.test(email) ? '이메일 형식이 올바르지 않습니다.' : null;
  const passwordError = touched && password.length < 8 ? '비밀번호는 8자 이상입니다.' : null;

  const submit = async () => {
    setTouched(true);
    if (!EMAIL.test(email) || password.length < 8) return;
    const ok = await signIn(email, password);
    if (ok) router.replace('/');
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
        <NavBar title="이메일로 로그인" />

        <Input
          label="이메일"
          style={styles.first}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            clearError();
          }}
          error={emailError}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <Input
          label="비밀번호"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearError();
          }}
          error={passwordError}
          placeholder="8자 이상"
          password
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.field}
        />

        {/* The server's answer, distinct from the two field-level ones above it. */}
        {error ? (
          <Text variant="caption" style={styles.serverError}>
            {error}
          </Text>
        ) : null}

        <Button label="로그인" onPress={submit} loading={pending} style={styles.submit} />

        {/*
          The two ways out of a failed sign-in, side by side and equally weighted — someone who
          cannot get in does not yet know which half of the credential they have lost. Signing up
          is not here: that branch is on the door, and this screen is for people who already have
          an account.

          Neither has an endpoint on the backend (only signup, login, oauth and me), so both are
          design only and say so when tapped.
        */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast('이메일 찾기는 준비 중입니다')}
            style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
          >
            <Text variant="label" tone="muted">이메일 찾기</Text>
          </Pressable>

          <View style={styles.footerDivider} />

          <Pressable
            accessibilityRole="button"
            onPress={() => toast('비밀번호 재설정은 준비 중입니다')}
            style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
          >
            <Text variant="label" tone="muted">비밀번호 재설정</Text>
          </Pressable>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[6] },
  /** 이름 줄과 첫 입력 사이 — 32. 서로 다른 종류의 것이다. */
  first: { marginTop: space[6] },
  field: { marginTop: space[4] },
  serverError: { marginTop: space[3] },
  submit: { marginTop: space[5] },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: space[6] },
  footerLink: {
    paddingVertical: space[3],
    paddingHorizontal: space[3],
    borderRadius: radius.base,
  },
  footerLinkPressed: { backgroundColor: colors.surface },
  footerDivider: { width: StyleSheet.hairlineWidth, height: 12, backgroundColor: colors.borderSubtle },
});
