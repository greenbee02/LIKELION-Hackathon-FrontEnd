import { Gift } from 'lucide-react-native';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTabBarSpace } from '@/components/navigation/tab-bar';
import { RewardEntry } from '@/components/reward/reward-entry';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useCards } from '@/lib/cards-store';
import type { Reward } from '@/lib/types';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 리워드 — what the collection is for.
 *
 * The collection screen answers "what do I have"; this one answers "what is it worth", and the
 * two are the same loop seen from either end. Every entry names the official collection it is
 * counted on, so a customer who wants a reward knows which card to go and buy — that thread is
 * the product's whole return path, and a rewards screen that only listed what was already
 * unlocked would cut it.
 *
 * **Rewards belong to a house, never to Curio.** When they span more than one the list is grouped
 * under brand headings; with a single house there is nothing to divide, so the heading is dropped
 * rather than printed once over everything. Derived, not declared — the same rule the collection
 * screen's filters follow, and for the same reason: a heading over a group of one is a category
 * that does not categorise.
 */
export default function RewardsScreen() {
  const { status, rewards, error } = useCards();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();

  const groups = useMemo(() => groupByBrand(rewards), [rewards]);

  const title = (
    <Text variant="title" style={styles.title}>
      리워드
    </Text>
  );

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
        {title}
        <EmptyState
          icon={Gift}
          title="리워드를 불러오지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
        {title}
        <View style={styles.list}>
          <Skeleton style={styles.panelSkeleton} />
          <Skeleton style={styles.panelSkeleton} />
        </View>
      </Screen>
    );
  }

  if (rewards.length === 0) {
    return (
      <Screen contentContainerStyle={{ paddingBottom: bottomSpace }}>
        {title}
        <EmptyState
          icon={Gift}
          title="아직 열린 리워드가 없습니다"
          note={'카드를 모으면 브랜드가 준비한\n리워드가 하나씩 열립니다.'}
          action={{ label: '카드 발급받기', onPress: () => router.push('/scan') }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={{ paddingBottom: bottomSpace }}>
      {title}
      <View style={styles.list}>
        {groups.map((group) => (
          <View key={group.brandId} style={styles.group}>
            {groups.length > 1 ? (
              <Text variant="heading" style={styles.groupHead}>
                {group.brandName}
              </Text>
            ) : null}
            {group.rewards.map((reward) => (
              <RewardEntry key={reward.id} reward={reward} />
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

/** Brand order follows the rewards as they arrive, so the backend keeps control of what leads. */
function groupByBrand(rewards: Reward[]) {
  const groups = new Map<string, { brandId: string; brandName: string; rewards: Reward[] }>();
  for (const reward of rewards) {
    const group = groups.get(reward.brand.id);
    if (group) group.rewards.push(reward);
    else
      groups.set(reward.brand.id, {
        brandId: reward.brand.id,
        brandName: reward.brand.name,
        rewards: [reward],
      });
  }
  return [...groups.values()];
}

const styles = StyleSheet.create({
  title: { paddingTop: space[2] },
  /** 24 between rewards: each is its own offer, not a row of one table. */
  list: { marginTop: space[5], gap: space[5] },
  group: { gap: space[5] },
  groupHead: { marginBottom: -space[2] },
  /* Shaped like the panel it stands in for — head, note, bar and control, at the heights those
     four land on — so the list does not resize under the customer when the data arrives. */
  panelSkeleton: { height: 232, borderRadius: radius.base },
});
