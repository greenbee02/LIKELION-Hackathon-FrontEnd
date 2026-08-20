import { useRouter } from 'expo-router';
import { Gift, Sparkles, Star } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Text } from '@/components/ui/text';
import { TicketProgress } from '@/components/ui/ticket-progress';
import { formatPurchaseDate } from '@/lib/format';
import type { Reward, RewardKind } from '@/lib/types';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/**
 * What the control says depends on what kind of thing the reward is.
 *
 * The brief's own examples do not agree with each other: an invitation has nothing to hand over,
 * a benefit is used rather than collected, and goods are picked up in a shop. One label cannot
 * cover all three without going vague — "확인하기" says nothing about what happens next, and the
 * whole point of this screen is that a reward is a reason to walk back into a store.
 */
const CLAIM_LABEL: Record<RewardKind, string> = {
  EVENT: '초대 확인하기',
  BENEFIT: '혜택 사용하기',
  GOODS: '매장에서 받기',
};

/**
 * 종류를 그리는 아이콘.
 *
 * **표가 아니다.** 오른쪽 끝의 표는 얼마나 모았는지를 세는 것이고 이쪽은 무엇인지를 말하므로,
 * 둘이 같은 그림이면 한 행에 같은 아이콘이 두 종류의 뜻으로 등장한다.
 */
const KIND_ICON: Record<RewardKind, ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  EVENT: Star,
  BENEFIT: Sparkles,
  GOODS: Gift,
};

/**
 * 리워드 한 건, 한 행으로.
 *
 * **아이콘 · 이름 · 값.** 목록의 줄이 읽히는 순서가 그것이고, 리워드에서 값에 해당하는 것은
 * 얼마나 모았는가다. 이전에는 같은 사실이 세 번 적혀 있었다 — `0 / 3장` 과 빈 게이지와
 * `앞으로 3장` 이 전부 "세 장이 필요하고 하나도 없다"는 한 문장이었고, 그 한 문장이 네 줄을
 * 썼다. 표가 그 말을 하므로 숫자와 각주는 지웠다.
 *
 * **잠긴 리워드를 보여주는 것이 이 화면의 목적이다.** 이미 받은 것은 영수증이고, 두 장 남은
 * 것이 세 번째 카드를 살 이유다. 그래서 잠긴 것도 같은 줄에 서고, 열린 것만 아래에 버튼을
 * 하나 더 갖는다.
 *
 * 패널은 눌리지 않는다. 앱의 모든 pressable 은 눌리는 동안 16% 자라는데, 타일에는 맞고 폭을
 * 다 쓰는 패널에는 틀리다 — 양쪽 여백을 넘어 부풀고 웹 익스포트에서는 스크롤 뷰가 그 모서리를
 * 잘라낸다. 게다가 리워드의 조작은 종류마다 이름이 다르고, 그 이름은 이름을 가진 버튼만이
 * 말할 수 있다.
 */
export function RewardEntry({ reward }: { reward: Reward }) {
  const router = useRouter();
  const Icon = KIND_ICON[reward.kind];
  const settled = reward.status === 'CLAIMED' || reward.status === 'EXPIRED';

  return (
    <Panel>
      <View style={styles.row}>
        <Icon size={24} color={colors.text} strokeWidth={2} />

        <View style={styles.body}>
          <Text variant="body" numberOfLines={2}>
            {reward.title}
          </Text>
          {/* 어느 세트를 모아야 하는지. 이름 아래 회색 한 줄로, 이름과 다투지 않는다. */}
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.collection}>
            {reward.collection.name}
          </Text>
        </View>

        {/* 값의 자리. 끝난 리워드에는 셀 것이 없고 언제 끝났는지가 값이 된다. */}
        {settled ? (
          <Badge label={reward.status === 'CLAIMED' ? '수령 완료' : '기간 만료'} />
        ) : (
          <TicketProgress progress={reward.progress} total={reward.total} />
        )}
      </View>

      {reward.status === 'UNLOCKED' ? (
        <Button
          label={CLAIM_LABEL[reward.kind]}
          onPress={() => router.push({ pathname: '/reward/[id]', params: { id: reward.id } })}
          style={styles.action}
        />
      ) : null}

      {settled ? (
        <Text variant="caption" tone="muted" style={styles.foot}>
          {footnote(reward)}
        </Text>
      ) : null}
    </Panel>
  );
}

/**
 * 끝난 리워드의 마지막 줄.
 *
 * 수령한 것에는 날짜를 말한다 — 쓴 혜택에 대해 사람이 묻는 것은 언제 썼는지 하나뿐이다.
 * 잠긴 것에는 아무 줄도 붙지 않는다: 오른쪽 표가 이미 몇 장이 남았는지 말했고, 같은 말을
 * 문장으로 한 번 더 적으면 그것이 이 패널을 네 줄로 만들던 각주다.
 *
 * 수령 매장은 적지 않는다. 어느 매장에서 받았는지는 **스키마 어디에도 열이 없고**, 직원
 * 도메인이 생기기 전까지는 생기지도 않는다(백엔드 운영 정책).
 */
function footnote(reward: Reward): string {
  if (reward.status === 'CLAIMED') {
    return reward.claimedAt ? `${formatPurchaseDate(reward.claimedAt)} 수령` : '수령이 완료되었습니다';
  }
  return reward.expiresAt ? `${formatPurchaseDate(reward.expiresAt)} 만료` : '기간이 지났습니다';
}

const styles = StyleSheet.create({
  /* 아이콘과 값은 세로 가운데, 이름은 두 줄이 될 수 있으므로 그 가운데에 맞춘다. */
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  /* 이름이 길어도 표를 밀어내지 않는다 — 값은 언제나 오른쪽 끝에 있어야 목록으로 읽힌다. */
  body: { flex: 1 },
  collection: { marginTop: space[1] },
  action: { marginTop: space[4] },
  foot: { marginTop: space[3] },
});
