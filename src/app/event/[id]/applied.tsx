import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarCheck } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import { applicationOf, cancelApplication, fetchEvent, type BrandEvent } from '@/lib/events';
import { formatPurchaseDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 신청 완료 — 접수됐다는 사실과 신청 번호.
 *
 * **뒤로 가기가 없다.** 방금 신청한 사람이 돌아갈 곳은 신청 화면이 아니라 리워드 목록이고,
 * 여기까지 `replace` 로 왔으므로 앞 화면은 이미 없다. 대신 나가는 길을 버튼으로 명시한다.
 *
 * 취소를 함께 둔다. 되돌릴 수 있는 일이라 `Dialog` 로 묻지 않고, 대신 눈에 덜 띄는 무게로
 * 놓는다 — 방금 신청한 사람에게 취소를 크게 보여주는 화면은 자기가 방금 한 일을 의심하게
 * 만든다.
 *
 * **확정이 아니라 접수다.** 프라이빗 초대는 하우스가 검토하고 정원이 있는 자리는 우선
 * 신청이라, 카피가 그 사실을 넘어서지 않아야 한다.
 */
export default function EventAppliedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => fetchEvent(id ?? ''), [id]);
  const { status, data } = useResource<BrandEvent>(load);

  const code = applicationOf(id ?? '');

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        <Skeleton style={styles.markSkeleton} />
        <Skeleton style={styles.lineSkeleton} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState
          icon={CalendarCheck}
          title="행사를 찾을 수 없습니다"
          note="종료되었거나 잘못된 주소입니다."
          action={{ label: '리워드로 가기', onPress: () => router.replace('/rewards') }}
        />
      </Screen>
    );
  }

  const drop = () => {
    setCancelling(true);
    void (async () => {
      await cancelApplication(data.id);
      setCancelling(false);
      toast('신청을 취소했습니다.');
      router.replace('/rewards');
    })();
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.mark}>
        <CalendarCheck size={40} color={colors.text} strokeWidth={1.5} />
      </View>

      <Text variant="title" style={styles.title}>
        신청이 접수되었습니다
      </Text>
      <Text variant="body" tone="muted" style={styles.note}>
        {'자리가 확정되면 하우스가 다시 안내해 드립니다.\n확정 전까지는 참석이 보장되지 않습니다.'}
      </Text>

      <Panel style={styles.facts}>
        <Text variant="heading">{data.title}</Text>
        <Text variant="caption" tone="muted" style={styles.when}>
          {`${formatPurchaseDate(data.startAt)} · ${data.location}`}
        </Text>
        {code ? (
          <>
            <View style={styles.divider} />
            <Text variant="caption" tone="muted">
              신청 번호
            </Text>
            <Text variant="heading" style={styles.code}>
              {code}
            </Text>
          </>
        ) : null}
      </Panel>

      <View style={styles.foot}>
        <Button label="리워드로 돌아가기" onPress={() => router.replace('/rewards')} />
        {code ? <TextLink label="신청 취소" onPress={drop} /> : null}
      </View>
      {cancelling ? null : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[6] },
  mark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.backgroundSubtle,
  },
  title: { marginTop: space[5], textAlign: 'center' },
  note: { marginTop: space[3], textAlign: 'center' },
  facts: { marginTop: space[6] },
  when: { marginTop: space[1] },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: space[3],
  },
  code: { marginTop: space[1] },
  /** 나가는 길은 화면의 바닥에. 떠나는 일은 화면의 마지막 순서다. */
  foot: { marginTop: 'auto', paddingBottom: space[4], gap: space[2] },
  markSkeleton: { width: 72, height: 72, borderRadius: radius.full, alignSelf: 'center' },
  lineSkeleton: { height: 30, width: '60%', alignSelf: 'center', marginTop: space[5] },
});
