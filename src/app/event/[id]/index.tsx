import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { applyToEvent, applicationOf, fetchEvent, type BrandEvent } from '@/lib/events';
import { formatPurchaseDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 행사 종류를 화면의 말로. 종류마다 신청이 뜻하는 바가 다르다. */
const KIND_LABEL: Record<BrandEvent['eventType'], string> = {
  PREVIEW: '프리뷰',
  CLASS: '클래스',
  PRIVATE_INVITATION: '프라이빗 초대',
  POPUP: '팝업',
};

/**
 * 행사 하나 — 무엇이고 언제이며 어디인지, 그리고 신청.
 *
 * **신청은 확정이 아니다.** 정원이 있는 자리는 우선 신청이고 프라이빗 초대는 하우스가 검토
 * 후 정한다. 버튼이 "신청하기"이고 다음 화면이 "신청 완료"인 것은 그래서다 — 참석이 확정된
 * 것처럼 적으면 오지 못하게 된 사람에게 두 번 실망을 준다.
 *
 * 남은 자리를 숫자로 적는다. 정원이 있는 행사에서 그것은 신청을 서두를 이유이자, 마감됐을 때
 * 왜 신청할 수 없는지에 대한 답이기도 하다.
 */
export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [applying, setApplying] = useState(false);

  const load = useCallback(() => fetchEvent(id ?? ''), [id]);
  const { status, data, error } = useResource<BrandEvent>(load);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/rewards" />
    </View>
  );

  if (status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <Skeleton style={styles.titleSkeleton} />
        <Skeleton style={styles.panelSkeleton} />
      </Screen>
    );
  }

  if (status === 'error' || !data) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        <EmptyState
          icon={CalendarDays}
          title="행사를 찾을 수 없습니다"
          note={error ?? '종료되었거나 잘못된 주소입니다.'}
          action={{ label: '리워드로 가기', onPress: () => router.replace('/rewards') }}
        />
      </Screen>
    );
  }

  const event = data;
  const left = Math.max(0, event.capacity - event.appliedCount);
  const applied = applicationOf(event.id);
  const full = left === 0;

  const apply = () => {
    setApplying(true);
    void (async () => {
      try {
        await applyToEvent(event.id);
        router.replace({ pathname: '/event/[id]/applied', params: { id: event.id } });
      } catch (e) {
        setApplying(false);
        toast(e instanceof Error ? e.message : '신청하지 못했습니다.');
      }
    })();
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}
      <PageHeader title={event.title} />

      <View style={styles.tags}>
        <Badge label={KIND_LABEL[event.eventType]} />
        {full ? <Badge label="신청 마감" /> : null}
      </View>

      <Text variant="body" tone="muted" style={styles.description}>
        {event.description}
      </Text>

      <Panel style={styles.facts}>
        <Fact label="일시" value={`${formatPurchaseDate(event.startAt)} · ${time(event.startAt)}`} />
        <Fact label="장소" value={event.location} />
        <Fact label="자리" value={full ? '마감' : `${left}자리 남음`} last />
      </Panel>

      {applied ? (
        <Panel style={styles.doneBox}>
          <Text variant="body">이미 신청하셨습니다.</Text>
          <Text variant="caption" tone="muted" style={styles.doneCode}>
            {`신청 번호 ${applied}`}
          </Text>
        </Panel>
      ) : (
        <Button
          label={full ? '신청이 마감되었습니다' : '신청하기'}
          disabled={full}
          loading={applying}
          onPress={apply}
          style={styles.action}
        />
      )}
    </Screen>
  );
}

/** 시각만. 날짜는 `formatPurchaseDate` 가 맡고, 여기도 로케일에 기대지 않는다. */
function time(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Fact({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[7] },
  nav: { flexDirection: 'row' },
  tags: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  description: { marginTop: space[4] },
  facts: { marginTop: space[5] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  action: { marginTop: space[6] },
  doneBox: { marginTop: space[6] },
  doneCode: { marginTop: space[1] },
  titleSkeleton: { height: 30, width: '70%', marginTop: space[5], borderRadius: radius.small },
  panelSkeleton: { height: 200, marginTop: space[5], borderRadius: radius.base },
});
