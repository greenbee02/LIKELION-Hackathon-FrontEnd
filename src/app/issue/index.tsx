import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { space } from '@/theme/spacing';

/**
 * 영수증 코드를 손으로 적는 화면.
 *
 * 스캔 화면이 있는데 이것이 따로 필요한 이유는 **카메라가 늘 되는 것이 아니기 때문이다.**
 * 브라우저는 보안 컨텍스트가 아니면 카메라를 열어주지 않아서 LAN 주소로 띄운 개발 서버에서는
 * 미리보기가 검은 채로 있고, 권한을 한 번 거절한 기기는 `canAskAgain` 이 false 라 다시 묻지도
 * 않는다. 영수증에는 코드가 글자로도 인쇄돼 있으므로, 그때 할 수 있는 일이 없어서는 안 된다.
 *
 * **이 화면도 토큰을 판단하지 않는다.** 적힌 것을 그대로 `/issue/[token]` 에 넘기고, 유효한지
 * 이미 쓴 것인지 기한이 지났는지는 거기서 갈린다 — 스캔 화면이 같은 이유로 아무 판단도 하지
 * 않는 것과 짝이다. 두 입구가 각자 오류 화면을 갖게 되면 그 둘은 반드시 어긋난다.
 */
export default function ManualCodeScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const token = code.trim().toUpperCase();

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <BackButton fallback="/" />
      </View>
      <PageHeader title="코드 직접 입력" />

      <Text variant="body" tone="muted" style={styles.intro}>
        영수증에 인쇄된 코드를 그대로 입력해주세요. QR 코드 아래에 함께 적혀 있습니다.
      </Text>

      <Input
        label="영수증 코드"
        required
        value={code}
        onChangeText={setCode}
        placeholder="예: MCM-DEMO-2026-001"
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.field}
      />

      <Button
        label="카드 발급하기"
        disabled={token.length === 0}
        onPress={() => router.push({ pathname: '/issue/[token]', params: { token } })}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[7] },
  nav: { flexDirection: 'row' },
  intro: { marginTop: space[4] },
  field: { marginTop: space[5] },
  action: { marginTop: space[6] },
});
