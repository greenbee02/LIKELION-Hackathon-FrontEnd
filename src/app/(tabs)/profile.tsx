import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useAuth } from '@/lib/auth-store';
import { useCards } from '@/lib/cards-store';
import { useCollections } from '@/lib/collections-store';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * My — 무엇을 갖고 있는지, 그리고 나가는 문 둘.
 *
 * **이 화면이 답해야 하는 질문은 "내가 뭘 갖고 있나"다.** 이전에는 이메일 한 줄과 로그아웃이
 * 전부여서, 탭 하나를 차지하면서 아무것도 알려주지 않았다. 카드와 컬렉션과 열린 리워드의 수는
 * 이미 메모리에 있으므로(두 store 가 앱 수명 동안 들고 있다) 새 왕복 없이 그 답을 적을 수 있고,
 * 「받을 리워드」가 0이 아니라는 사실 자체가 리워드 탭으로 가라는 신호가 된다.
 *
 * **뒤에 아무것도 없는 행은 만들지 않았다.** 알림 설정도, 약관도, 고객문의도, 프로필 사진도
 * 백엔드에 근거가 없다. 눌러도 아무 일이 없거나 없는 화면으로 가는 줄을 늘어놓는 것보다
 * 짧은 화면이 정직하다.
 *
 * Sign-out is here before anything else because without it the app has no exit: the session
 * survives a reload, the gate sends a signed-in customer straight past `/sign-in`, and the door
 * becomes unreachable from inside the product.
 *
 * **Withdrawal is a real endpoint and it is destructive, so it asks first.** An account holding a
 * collection should not be deletable by a mis-tap on the way to signing out. The two live in the
 * same foot but not at the same weight — signing out is `outline` because it is reversible and
 * ordinary; withdrawal is a plain link under it.
 */
export default function ProfileScreen() {
  const { user, signOut, withdraw, pending } = useAuth();
  const { status, cards, rewards } = useCards();
  const { status: collectionsStatus, collections } = useCollections();
  const [confirming, setConfirming] = useState(false);
  const bottomSpace = useTabBarSpace();
  const router = useRouter();

  /* 이름이 비면 이메일의 앞부분이 대신 선다 — 백엔드가 `users.name` 을 NOT NULL 로 두지만
     그 값이 이메일에서 시드된 경우가 있어, 둘 다 없을 때만 자리를 비운다. */
  const name = user?.name?.trim() || user?.email?.split('@')[0] || null;
  const unlocked = rewards.filter((r) => r.status === 'UNLOCKED').length;
  const counting = status === 'loading' || collectionsStatus === 'loading';

  return (
    <Screen scroll contentContainerStyle={{ ...styles.content, paddingBottom: bottomSpace }}>
      <Text variant="title" style={styles.title}>
        My
      </Text>

      <Panel style={styles.account}>
        <View style={styles.identity}>
          {/* 사진이 들어갈 열이 백엔드에 없다. 탭 바가 이 화면을 가리키는 데 쓰는 것과 같은
              아이콘이라, 여기가 어디인지를 그림 하나로 말한다. */}
          <View style={styles.avatar}>
            <User size={24} color={colors.text} strokeWidth={2} />
          </View>
          <View style={styles.who}>
            {name ? (
              <Text variant="body" numberOfLines={1}>
                {name}
              </Text>
            ) : null}
            {user?.email ? (
              <Text variant="caption" tone="muted" numberOfLines={1} style={styles.email}>
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>
      </Panel>

      <Panel style={styles.counts}>
        <Count
          value={cards.length}
          label="카드"
          loading={counting}
          onPress={() => router.push('/')}
        />
        <View style={styles.divider} />
        <Count
          value={collections.length}
          label="컬렉션"
          loading={counting}
          onPress={() => router.push('/collection')}
        />
        <View style={styles.divider} />
        <Count
          value={unlocked}
          label="받을 리워드"
          loading={counting}
          onPress={() => router.push('/rewards')}
        />
      </Panel>

      <View style={styles.foot}>
        <Button label="로그아웃" variant="outline" onPress={signOut} loading={pending} />
        {/* 버튼이 아니라 링크다. 버튼 무게의 컨트롤이 이 바닥에 셋이면 화면이 메뉴로 납작해지고,
            계정을 지우는 것이 가장 누르기 쉬운 것이어서는 안 된다. */}
        <TextLink label="회원 탈퇴" onPress={() => setConfirming(true)} />
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

/**
 * 숫자 한 칸.
 *
 * 세 칸이 한 패널을 나눠 쓰므로 각 칸이 자기 폭을 주장하지 않는다(`flex: 1`). 로딩 중에는
 * 숫자 자리에만 스켈레톤이 서고 라벨은 그대로다 — 라벨은 데이터가 아니라 이 칸이 무엇인지에
 * 대한 것이라 기다릴 이유가 없다.
 */
function Count({
  value,
  label,
  loading,
  onPress,
}: {
  value: number;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.count, pressed && styles.pressed]}
    >
      {loading ? (
        <Skeleton style={styles.countSkeleton} />
      ) : (
        <Text variant="title">{value}</Text>
      )}
      <Text variant="caption" tone="muted" style={styles.countLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /* 바닥의 로그아웃이 화면 끝으로 밀리려면 내용이 짧아도 스크롤 뷰가 화면 높이를 채워야 한다. */
  content: { flexGrow: 1 },
  title: { paddingTop: space[2] },
  account: { marginTop: space[5] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  /**
   * 48 — 이름 두 줄과 같은 높이. 테두리만 있고 속은 페이지 그대로다.
   *
   * 채워진 12단계 원은 이 화면에서 유일하게 검은 덩어리여서, 아무것도 아닌 자리(사진이 없어
   * 아이콘이 서 있을 뿐인 자리)가 가장 무거운 것이 됐다. 감싼 패널이 같은 이유로 면을 버리고
   * 선을 골랐으므로, 그 안의 원도 같은 규칙을 따른다.
   */
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  who: { flex: 1 },
  email: { marginTop: space[1] },

  counts: { marginTop: space[3], flexDirection: 'row', alignItems: 'center' },
  count: { flex: 1, alignItems: 'center', paddingVertical: space[2], borderRadius: radius.small },
  countLabel: { marginTop: space[1] },
  countSkeleton: { width: 28, height: 24, borderRadius: radius.small },
  /** 6단계 세로 선. 칸을 가르되 세 칸이 각각의 상자로 보이지는 않을 만큼만. */
  divider: { width: 1, height: 28, backgroundColor: colors.borderSubtle },

  pressed: { backgroundColor: colors.surface },

  /** Pushed to the bottom: leaving is the last thing on a screen, never the first. */
  foot: { marginTop: 'auto', paddingTop: space[6], gap: space[3] },
});
