import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-store';
import { space } from '@/theme/spacing';

const EMAIL = /^\S+@\S+\.\S+$/;

/**
 * The end of the email branch, reached from the sign-in screen rather than from the door.
 *
 * Two fields and three consents, and nothing else. No referral code, no optional marketing
 * consent, no display name — an account here exists to hold cards, and every field that is not
 * needed to issue the first one is a reason to abandon the form.
 *
 * It carries no social buttons either: a customer who wanted Google took it on the first screen,
 * and repeating the providers here would imply they lead somewhere different. Nor a "이미 계정이
 * 있으신가요?" line — the back arrow and the door behind it are both one tap away, and a form's
 * last word should be the thing it wants you to do.
 */
const REQUIRED_TERMS = [
  { id: 'age', label: '[필수] 만 14세 이상입니다' },
  { id: 'tos', label: '[필수] 이용약관 동의' },
  { id: 'privacy', label: '[필수] 개인정보 수집 및 이용 동의' },
] as const;

type TermId = (typeof REQUIRED_TERMS)[number]['id'];

export default function SignUpScreen() {
  const { signUp, pending, error, clearError } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [agreed, setAgreed] = useState<Record<TermId, boolean>>({
    age: false,
    tos: false,
    privacy: false,
  });

  const allAgreed = REQUIRED_TERMS.every((t) => agreed[t.id]);
  const fieldsValid = EMAIL.test(email) && password.length >= 8;

  const emailError = touched && !EMAIL.test(email) ? '이메일 형식이 올바르지 않습니다.' : null;
  const passwordError = touched && password.length < 8 ? '비밀번호는 8자 이상입니다.' : null;

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreed({ age: next, tos: next, privacy: next });
  };

  const submit = async () => {
    setTouched(true);
    if (!fieldsValid || !allAgreed) return;
    // The backend's signup takes a nickname. Rather than ask for one the customer has no reason
    // to have chosen yet, seed it from the address and let them rename it from their profile.
    const ok = await signUp(email, password, email.split('@')[0]);
    if (ok) router.replace('/');
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BackButton />

        <View style={styles.header}>
          <Text variant="title">회원가입</Text>
        </View>

        <Input
          label="이메일 주소"
          required
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
          required
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearError();
          }}
          error={passwordError}
          placeholder="8자 이상"
          password
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.field}
        />

        {/*
          Consent, and only the required kind — there is no optional marketing tier to opt into
          yet, so "모두 동의합니다" governs three boxes that all have to be ticked anyway. It stays
          because ticking one control is faster than ticking three.

          The terms themselves are not written. No "내용 보기" link is offered rather than offering
          one that opens nothing: a link to a document that does not exist is worse than its absence.
        */}
        <View style={styles.terms}>
          <Checkbox checked={allAgreed} onToggle={toggleAll}>
            <Text variant="body">모두 동의합니다</Text>
          </Checkbox>

          <View style={styles.termsList}>
            {REQUIRED_TERMS.map((term) => (
              <Checkbox
                key={term.id}
                mark="mark"
                checked={agreed[term.id]}
                onToggle={() => setAgreed((prev) => ({ ...prev, [term.id]: !prev[term.id] }))}
              >
                <Text variant="label" tone={agreed[term.id] ? 'default' : 'muted'}>
                  {term.label}
                </Text>
              </Checkbox>
            ))}
          </View>
        </View>

        {error ? (
          <Text variant="caption" style={styles.serverError}>
            {error}
          </Text>
        ) : null}

        <Button
          label="가입하기"
          onPress={submit}
          loading={pending}
          disabled={!allAgreed}
          style={styles.submit}
        />

      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[3], paddingBottom: space[6] },
  header: { marginTop: space[5], marginBottom: space[6] },
  field: { marginTop: space[4] },
  terms: { marginTop: space[6] },
  /**
   * Not indented. The tick column and the box column are the same slot, so the three lines
   * line up under the control that governs them; the hierarchy is already carried by the mark
   * (a box operates, a tick reports) and by the step down in type size.
   */
  termsList: { marginTop: space[2] },
  serverError: { marginTop: space[3] },
  submit: { marginTop: space[5] },
});
