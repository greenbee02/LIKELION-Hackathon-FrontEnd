import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { formatPurchaseDate } from '@/lib/format';
import type { Reward, RewardKind } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
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
 * One reward, as a panel.
 *
 * A panel rather than a bare block, because unlike the collection — where the cards are the
 * subject and any chrome around them would compete — a reward has no picture of its own. What
 * would separate one from the next is nothing but a gap, and a gap at this density reads as one
 * long list of sentences.
 *
 * **Locked rewards are shown, and that is the point of the screen.** A reward already in hand is
 * a receipt; a reward two cards away is the reason there is a third card to buy. So the locked
 * ones carry the bar and what is missing, and only the open ones carry a control.
 *
 * The panel itself is not pressable, and that is deliberate rather than an omission. Every
 * pressable in this app grows 16% under the finger, which is right for a tile and wrong for a
 * full-width panel — it would swell past both gutters and get clipped by the scroll view on the
 * web export. A reward's action also has a name that changes with its kind, and a named button
 * says that where a tappable rectangle cannot.
 */
export function RewardEntry({ reward }: { reward: Reward }) {
  const router = useRouter();

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text variant="heading" style={styles.title}>
          {reward.title}
        </Text>
        {reward.status === 'CLAIMED' ? <Badge label="수령 완료" /> : null}
        {reward.status === 'EXPIRED' ? <Badge label="기간 만료" /> : null}
      </View>

      {/* 하우스가 이게 무엇인지 설명하는 줄. `rewards.description` 이 DTO 에 실리지 않아
          실서버에서는 비어 있고, 없으면 줄을 그리지 않는다 — 빈 문단은 설명이 아니라 구멍이다. */}
      {reward.note ? (
        <Text variant="body" tone="muted" style={styles.note}>
          {reward.note}
        </Text>
      ) : null}

      <View style={styles.progress}>
        <View style={styles.progressHead}>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.collection}>
            {reward.collection.name}
          </Text>
          <Text variant="caption">
            {reward.progress} / {reward.total}장
          </Text>
        </View>
        <ProgressBar value={reward.progress} total={reward.total} />
      </View>

      {reward.status === 'UNLOCKED' ? (
        <Button
          label={CLAIM_LABEL[reward.kind]}
          onPress={() => router.push({ pathname: '/reward/[id]', params: { id: reward.id } })}
          style={styles.action}
        />
      ) : (
        <Text variant="caption" tone="muted" style={styles.foot}>
          {footnote(reward)}
        </Text>
      )}
    </View>
  );
}

/**
 * 조작할 것이 없는 리워드의 마지막 줄.
 *
 * 잠긴 것에는 가진 것이 아니라 모자란 것을 말한다 — 위의 숫자가 이미 가진 것을 말했고,
 * 행동으로 옮길 수 있는 형태는 "앞으로 2장"뿐이다. 수령한 것에는 날짜를 말한다: 쓴 혜택에
 * 대해 사람이 묻는 것은 언제 썼는지 하나뿐이다.
 *
 * 수령 매장은 적지 않는다. 어느 매장에서 받았는지는 **스키마 어디에도 열이 없고**, 직원
 * 도메인이 생기기 전까지는 생기지도 않는다(백엔드 운영 정책). 채워질 수 없는 자리를 비워두는
 * 것보다 그 자리를 만들지 않는 편이 낫다.
 */
function footnote(reward: Reward): string {
  switch (reward.status) {
    case 'LOCKED':
      return `앞으로 ${Math.max(0, reward.total - reward.progress)}장`;
    case 'CLAIMED':
      return reward.claimedAt
        ? `${formatPurchaseDate(reward.claimedAt)} 수령`
        : '수령이 완료되었습니다';
    default:
      return reward.expiresAt ? `${formatPurchaseDate(reward.expiresAt)} 만료` : '기간이 지났습니다';
  }
}

const styles = StyleSheet.create({
  panel: {
    padding: space[4],
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    /* The button inside grows under the finger, and on the web export this panel would be the
       first of three containers to clip it. */
    ...allowPressOverflow,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  title: { flexShrink: 1 },
  note: { marginTop: space[1] },
  /* 24 from the words above it: the bar is a different kind of statement from the sentence, and
     at 16 the two would read as one paragraph with a rule drawn through it. */
  progress: { marginTop: space[5], gap: space[2] },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  collection: { flexShrink: 1 },
  action: { marginTop: space[4] },
  foot: { marginTop: space[3] },
});
