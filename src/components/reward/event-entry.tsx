import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import type { BrandEvent } from '@/lib/events';
import { formatPurchaseDate } from '@/lib/format';
import { space } from '@/theme/spacing';

/**
 * 행사 하나, 목록의 한 칸으로.
 *
 * `RewardEntry` 와 같은 `Panel` 을 쓰되 진행 막대가 없다. 리워드는 모아야 열리는 것이라
 * 얼마나 왔는지가 핵심이고, 행사는 이미 열려 있고 자리가 줄어들 뿐이다 — 세는 방향이 반대다.
 *
 * **왜 보이는지를 제목 아래 적는다.** 근거를 못 대는 추천은 광고이고, 이 목록은 보유 카드에서
 * 근거를 뽑아 오므로 그 문장은 실제로 참이다.
 */
export function EventEntry({
  event,
  reason,
  onPress,
}: {
  event: BrandEvent;
  reason: string | null;
  onPress: () => void;
}) {
  const left = Math.max(0, event.capacity - event.appliedCount);

  return (
    <Panel>
      <View style={styles.head}>
        <Text variant="heading" style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        {left === 0 ? <Badge label="신청 마감" /> : null}
      </View>

      {reason ? (
        <Text variant="caption" tone="muted" style={styles.reason}>
          {reason}
        </Text>
      ) : null}

      <Text variant="body" tone="muted" style={styles.when}>
        {`${formatPurchaseDate(event.startAt)} · ${event.location}`}
      </Text>
      <Text variant="caption" tone="muted">
        {left === 0 ? '자리가 모두 찼습니다' : `${left}자리 남음`}
      </Text>

      <TextLink label="자세히 보기" onPress={onPress} align="start" style={styles.link} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[3] },
  title: { flex: 1 },
  reason: { marginTop: space[1] },
  when: { marginTop: space[3] },
  link: { marginTop: space[2], marginBottom: -space[3] },
});
