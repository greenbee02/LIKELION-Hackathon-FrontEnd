import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gift } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCards, useReward } from '@/lib/cards-store';
import { formatPurchaseDate } from '@/lib/format';
import type { Reward } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 리워드 수령 — one code, held up to a shop assistant.
 *
 * The screen exists because the reward is the product's return path: §10 wants the reward itself
 * to be a reason to walk back into a store, and a benefit that could be redeemed by tapping a
 * button in an app would not be. So the whole screen is one code and the sentence that tells you
 * what to do with it.
 *
 * The code is the subject, so it is the largest thing here — but not `display`, which is reserved
 * for the issuance moment and appears once in the whole app. A claim code is read aloud or copied
 * by eye across a counter, which is why it is tracked open: at default spacing `XQPT` and `XOPT`
 * are the same shape from a metre away.
 *
 * Four states, and only one of them has a code worth showing. `CLAIMED` keeps it visible but
 * spent, with the date under it, because the only question anyone asks about a used benefit is
 * whether it was actually used. `LOCKED` is reachable only by deep link — the list gives locked
 * rewards no control — and says so rather than showing a code that does not exist.
 *
 * **코드는 이 화면에서 만들어진다.** `user_rewards.claim_code` 는 해금 시점에 비어 있고
 * `POST /rewards/{id}/claim` 이 채우므로, 열렸지만 아직 발급받지 않은 리워드에는 코드 자리에
 * 코드가 아니라 버튼이 선다. 대시를 찍어두고 기다리게 하는 것보다 정확하다 — 없는 것은
 * 아직 요청하지 않았기 때문이지 오류가 아니고, 그렇다면 화면은 요청할 방법을 줘야 한다.
 */
export default function RewardClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reward, status } = useReward(id);
  const { error, claim } = useCards();
  const router = useRouter();
  const toast = useToast();
  const [issuing, setIssuing] = useState(false);

  /* 이름은 '리워드'다. 리워드의 제목이 아니라 — 그건 본문 첫 줄에서 24pt 로 읽히고 있고,
     화면의 주인공은 그 아래 코드다. */
  const nav = <NavBar title="리워드" fallback="/" />;

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <View style={styles.head}>
          <Skeleton style={styles.line} />
          <Skeleton style={[styles.line, styles.lineShort]} />
        </View>
        <Skeleton style={styles.codeSkeleton} />
      </Screen>
    );
  }

  if (!reward) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={Gift}
          title={status === 'error' ? '리워드를 불러오지 못했습니다' : '리워드를 찾을 수 없습니다'}
          note={status === 'error' ? (error ?? '잠시 후 다시 시도해 주세요.') : '만료되었거나 잘못된 주소입니다.'}
          action={{ label: '리워드로 가기', onPress: () => router.replace('/rewards') }}
        />
      </Screen>
    );
  }

  if (reward.status === 'LOCKED') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={Gift}
          title="아직 열리지 않은 리워드입니다"
          note={`${reward.collection.name} 컬렉션을 ${reward.total}장 모으면 열립니다.\n지금은 ${reward.progress}장입니다.`}
          action={{ label: '리워드로 가기', onPress: () => router.replace('/rewards') }}
        />
      </Screen>
    );
  }

  const spent = reward.status !== 'UNLOCKED';

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}

      <View style={styles.head}>
        {reward.brand.name ? (
          <Text variant="caption" tone="muted">
            {reward.brand.name}
          </Text>
        ) : null}
        <Text variant="title" style={styles.title}>
          {reward.title}
        </Text>
        {reward.note ? (
          <Text variant="body" tone="muted" style={styles.note}>
            {reward.note}
          </Text>
        ) : null}
      </View>

      <View style={styles.codePanel}>
        <Text variant="label" tone="muted">
          수령 코드
        </Text>

        {reward.claimCode ? (
          <>
            <Text variant="title" style={[styles.code, spent && styles.codeSpent]}>
              {reward.claimCode}
            </Text>
            <Text variant="caption" tone="muted" style={styles.codeNote}>
              {spent ? '이미 사용된 코드입니다' : '매장 직원에게 이 코드를 보여주세요'}
            </Text>
          </>
        ) : (
          <>
            <Button
              label={issuing ? '발급 중…' : '수령 코드 발급받기'}
              disabled={issuing}
              onPress={async () => {
                setIssuing(true);
                const ok = await claim(reward);
                setIssuing(false);
                if (!ok) toast('코드를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
              }}
              style={styles.issue}
            />
            <Text variant="caption" tone="muted" style={styles.codeNote}>
              매장에 도착하신 뒤 발급받으세요
            </Text>
          </>
        )}
      </View>

      <View style={styles.rows}>
        {detailRows(reward).map((row, i, all) => (
          <View key={row.label} style={[styles.row, i === all.length - 1 && styles.rowLast]}>
            <Text variant="label" tone="muted">
              {row.label}
            </Text>
            <Text variant="body" style={styles.value}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="caption" tone="muted" style={styles.foot}>
        수령 관련 문의는 방문하실 매장으로 연락해 주세요.
      </Text>
    </Screen>
  );
}

/** Same rule as everywhere else here: a row with nothing to say is not rendered. */
function detailRows(reward: Reward): { label: string; value: string }[] {
  const rows: { label: string; value?: string }[] = [
    { label: '상태', value: STATUS_LABEL[reward.status] },
    { label: '컬렉션', value: `${reward.collection.name} · ${reward.progress}/${reward.total}장` },
    {
      label: '해금 일시',
      value: reward.unlockedAt ? formatPurchaseDate(reward.unlockedAt) : undefined,
    },
    {
      label: '수령 일시',
      value: reward.claimedAt ? formatPurchaseDate(reward.claimedAt) : undefined,
    },
    { label: '사용 기한', value: reward.expiresAt ? `${formatPurchaseDate(reward.expiresAt)}까지` : undefined },
  ];
  return rows.filter((r): r is { label: string; value: string } => Boolean(r.value));
}

const STATUS_LABEL: Record<Reward['status'], string> = {
  LOCKED: '잠김',
  UNLOCKED: '수령 가능',
  CLAIMED: '수령 완료',
  EXPIRED: '기간 만료',
};

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[7] },
  head: { marginTop: space[5] },
  title: { marginTop: space[1] },
  note: { marginTop: space[2] },
  /* The one panel on the screen, because there is exactly one thing to hold up at a counter. */
  codePanel: {
    marginTop: space[6],
    padding: space[5],
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    alignItems: 'center',
  },
  /* Tracked open, which is the one place in the app a call site touches letter spacing: this is
     not type set to be read as words but characters to be told apart one at a time. */
  code: { marginTop: space[2], letterSpacing: 2 },
  /** Spent, so it is held back to the muted step — still legible, no longer the instruction. */
  codeSpent: { color: colors.textMuted },
  codeNote: { marginTop: space[2], textAlign: 'center' },
  /* 코드가 앉을 자리에 버튼이 서므로, 코드가 라벨에서 떨어져 있던 만큼 떨어진다. */
  issue: { marginTop: space[4], alignSelf: 'stretch' },
  rows: { marginTop: space[6] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowLast: { borderBottomWidth: 0 },
  value: { flex: 1, textAlign: 'right' },
  foot: { marginTop: space[5] },
  line: { height: 24, borderRadius: radius.small },
  lineShort: { width: '60%', marginTop: space[2] },
  codeSkeleton: { height: 140, borderRadius: radius.base, marginTop: space[6] },
});
