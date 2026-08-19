import { useLocalSearchParams, useRouter } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back-button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { fetchCareServices, type CareService } from '@/lib/care';
import { useCard } from '@/lib/cards-store';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 케어 서비스 안내 — 산 다음의 이야기.
 *
 * 카드가 구매 기록이자 보증서라면, 이 화면은 그 보증서를 실제로 쓰는 방법이다. 기획서 §9 의
 * "공식 수선·케어 서비스 링크"가 여기이고, 카드 상세의 제품 시트에서 들어온다.
 *
 * **맨 위 한 문단만 실데이터다.** `product.careInfo` 는 하우스가 이 물건에 대해 쓴 관리
 * 방법이고 서버가 실제로 보낸다. 그 아래 서비스 목록은 목이다 — 수선·클리닝 접수는 스키마에
 * 컬럼조차 없다. 두 부분이 시각적으로 나뉘어 있는 것은 그래서다.
 *
 * **접수 버튼이 없다.** 매장으로 안내하는 문장만 있고 누를 것은 없다. 접수를 받을 곳이 없는데
 * 버튼을 놓으면 그 버튼은 아무 일도 하지 않거나, 하는 척한다.
 */
export default function CareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status: cardStatus } = useCard(id);
  const router = useRouter();

  const load = useCallback(() => fetchCareServices(), []);
  const { status, data, error } = useResource<CareService[]>(load);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/" />
    </View>
  );
  const header = <PageHeader title="케어 서비스" />;

  if (cardStatus !== 'loading' && !card) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        {header}
        <EmptyState
          icon={Wrench}
          title="카드를 찾을 수 없습니다"
          note="삭제되었거나 잘못된 주소입니다."
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  if (cardStatus === 'loading' || status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        {header}
        <View style={styles.list}>
          {['s1', 's2', 's3'].map((key) => (
            <Skeleton key={key} style={styles.panelSkeleton} />
          ))}
        </View>
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        {header}
        <EmptyState
          icon={Wrench}
          title="안내를 불러오지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  const services = data ?? [];
  const careInfo = card?.product.careInfo;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}
      {header}

      {card ? (
        <Text variant="caption" tone="muted" style={styles.subject}>
          {card.product.name}
        </Text>
      ) : null}

      {/* 이 물건에만 해당하는 말이 먼저다. 아래 목록은 어느 물건에나 같은 말이라, 순서가
          뒤집히면 일반론이 개별 사실을 덮는다. 값이 없으면 그리지 않는다. */}
      {careInfo ? (
        <Panel style={styles.own}>
          <Text variant="label" tone="muted">
            이 제품의 관리 방법
          </Text>
          <Text variant="body" style={styles.ownBody}>
            {careInfo}
          </Text>
        </Panel>
      ) : null}

      <Text variant="heading" style={styles.sectionHead}>
        하우스가 제공하는 서비스
      </Text>

      <View style={styles.list}>
        {services.map((service) => (
          <Panel key={service.id}>
            <View style={styles.head}>
              <Text variant="heading">{service.title}</Text>
              {service.leadTimeDays ? (
                <Text variant="caption" tone="muted">
                  {`약 ${service.leadTimeDays}일`}
                </Text>
              ) : null}
            </View>
            <Text variant="body" tone="muted" style={styles.body}>
              {service.description}
            </Text>
            <View style={styles.divider} />
            <Text variant="caption" tone="muted">
              {service.channel.label}
            </Text>
          </Panel>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2], paddingBottom: space[7] },
  nav: { flexDirection: 'row' },
  subject: { marginTop: space[2] },
  own: { marginTop: space[5] },
  ownBody: { marginTop: space[2] },
  /** 32 — 이 제품의 이야기와 하우스의 이야기는 다른 절이다. */
  sectionHead: { marginTop: space[6] },
  list: { marginTop: space[4], gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  body: { marginTop: space[2] },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: space[3],
  },
  panelSkeleton: { height: 140, borderRadius: radius.base },
});
