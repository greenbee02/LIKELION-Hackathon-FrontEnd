import { StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 마이 — the account, and for now only the part of it that has somewhere to go.
 *
 * Sign-out is here before the rest of the screen because without it the app has no exit: the
 * session survives a reload, the gate sends a signed-in customer straight past `/sign-in`, and
 * the door becomes unreachable from inside the product. That is a hole in the demo as much as in
 * the app — the sign-in screen is the first thing anyone is shown, and it cannot be shown twice.
 *
 * Withdrawal (`DELETE /auth/me`) is a real endpoint and belongs on this screen too, but it is
 * destructive and needs a confirmation this screen does not have yet, so it is not offered.
 */
export default function ProfileScreen() {
  const { user, signOut, pending } = useAuth();
  const bottomSpace = useTabBarSpace();

  return (
    <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
      <Text variant="title" style={styles.title}>
        마이
      </Text>

      <View style={styles.account}>
        <Text variant="caption" tone="muted">
          로그인 계정
        </Text>
        <Text variant="body" style={styles.email} numberOfLines={1}>
          {user?.email ?? '-'}
        </Text>
      </View>

      <Text variant="body" tone="muted" style={styles.note}>
        프로필과 회원 탈퇴는 뒤쪽 단계입니다.
      </Text>

      <View style={styles.foot}>
        <Button label="로그아웃" variant="outline" onPress={signOut} loading={pending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space[2] },
  account: {
    marginTop: space[5],
    padding: space[4],
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
  },
  email: { marginTop: space[1] },
  note: { marginTop: space[5] },
  /** Pushed to the bottom: leaving is the last thing on a screen, never the first. */
  foot: { marginTop: 'auto' },
});
