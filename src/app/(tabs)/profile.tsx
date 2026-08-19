import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 마이 — the account, and the two ways out of it.
 *
 * Sign-out is here before anything else because without it the app has no exit: the session
 * survives a reload, the gate sends a signed-in customer straight past `/sign-in`, and the door
 * becomes unreachable from inside the product. That is a hole in the demo as much as in the app —
 * the sign-in screen is the first thing anyone is shown, and it cannot be shown twice.
 *
 * **Withdrawal is a real endpoint and it is destructive, so it asks first.** The dialog is the
 * whole feature: `DELETE /auth/me` is one line, and the reason this took a component is that an
 * account holding a collection should not be deletable by a mis-tap on the way to signing out.
 *
 * The two live in the same foot but not at the same weight. Signing out is `outline` because it
 * is reversible and ordinary; withdrawal is a plain link under it, because a screen where the two
 * look alike is a screen that has not said which one you probably meant.
 */
export default function ProfileScreen() {
  const { user, signOut, withdraw, pending } = useAuth();
  const [confirming, setConfirming] = useState(false);
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

      <View style={styles.foot}>
        <Button label="로그아웃" variant="outline" onPress={signOut} loading={pending} />
        {/* A text link, worn exactly as the sign-in screen's are — padded, `radius.base`, a
            step-3 fill under the finger and no underline. Not a button: a third control of button
            weight in this foot would flatten the screen into a menu, and the one that erases an
            account should never be the easiest thing to hit. */}
        <Pressable
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
          accessibilityLabel="회원 탈퇴"
          style={({ pressed }) => [styles.withdraw, pressed && styles.withdrawPressed]}
        >
          <Text variant="label" tone="muted">
            회원 탈퇴
          </Text>
        </Pressable>
      </View>

      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="회원 탈퇴"
        description={'탈퇴하면 보유하신 카드와 리워드를 더 이상 확인할 수 없습니다.\n이 작업은 되돌릴 수 없습니다.'}
        confirmLabel="탈퇴하기"
        onConfirm={() => {
          setConfirming(false);
          void withdraw();
        }}
        pending={pending}
      />
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
  /** Pushed to the bottom: leaving is the last thing on a screen, never the first. */
  foot: { marginTop: 'auto', gap: space[3] },
  withdraw: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.base,
  },
  withdrawPressed: { backgroundColor: colors.surface },
});
