import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { space } from '@/theme/spacing';

/** QR 카메라를 사용할 수 없을 때 영수증의 토큰을 직접 입력하는 화면. */
export default function IssueInputScreen() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const normalized = token.trim().toUpperCase();
    if (!normalized) {
      setError('영수증 코드를 입력해주세요.');
      return;
    }

    setError(null);
    router.replace({ pathname: '/issue/[token]', params: { token: normalized } });
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <NavBar title="코드 직접 입력" fallback="/scan" />

      <View style={styles.body}>
        <Text variant="title">영수증 코드를 입력해주세요</Text>
        <Text variant="body" tone="muted" style={styles.intro}>
          QR 코드를 스캔하기 어렵다면 영수증에 표시된 코드를 직접 입력할 수 있습니다.
        </Text>

        <Input
          label="영수증 코드"
          required
          value={token}
          error={error}
          placeholder="MCM-DEMO-2026-001"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="go"
          onChangeText={(value) => {
            setToken(value.toUpperCase());
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          style={styles.input}
        />

        <Text variant="caption" tone="muted" style={styles.note}>
          입력한 코드는 카드 발급 전에 상품과 매장 정보를 먼저 확인합니다.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="코드 확인하기" onPress={submit} disabled={!token.trim()} />
        <TextLink label="QR 스캔으로 돌아가기" onPress={() => router.replace('/scan')} style={styles.link} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  body: { flex: 1, justifyContent: 'center', paddingVertical: space[5] },
  intro: { marginTop: space[2] },
  input: { marginTop: space[6] },
  note: { marginTop: space[3] },
  footer: { paddingBottom: space[5] },
  link: { marginTop: space[2] },
});
