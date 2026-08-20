import { useLocalSearchParams } from 'expo-router';
import { AlertCircle, History } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CandidateContent } from '@/components/customize/candidate-content';
import { AiImagePreview } from '@/components/customize/ai-image-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import {
  fetchAiResource,
  fetchAiResources,
  isPending,
  RESOURCE_LABELS,
  toCandidate,
  type AiResource,
  type AiResourceGroup,
} from '@/lib/api/ai-resources';
import { formatPurchaseDate } from '@/lib/format';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 카드 꾸미기에서 만든 AI 후보를 다시 확인하는 화면. */
export default function AiResourcesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = id ?? '';
  const load = useCallback(() => fetchAiResources(cardId), [cardId]);
  const history = useResource(load);
  const [selected, setSelected] = useState<AiResource | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const openDetail = (resource: AiResource) => {
    setSelectedId(resource.id);
    setSelected(null);
    setDetailError(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const detail = await fetchAiResource(cardId, resource.id);
        setSelected(detail);
      } catch {
        setDetailError('리소스 상세 정보를 불러오지 못했습니다.');
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const nav = <NavBar title="AI 리소스 기록" fallback="/" />;

  if (history.status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <View style={styles.loadingList}>
          <Skeleton style={styles.groupSkeleton} />
          <Skeleton style={styles.groupSkeleton} />
        </View>
      </Screen>
    );
  }

  if (history.status === 'error' || !history.data) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={History}
          title="AI 기록을 불러오지 못했습니다"
          note={history.error ?? '잠시 후 다시 시도해 주세요.'}
          action={{ label: '다시 불러오기', onPress: history.reload }}
        />
      </Screen>
    );
  }

  if (history.data.groups.length === 0) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={History}
          title="아직 AI 리소스 기록이 없습니다"
          note="카드 꾸미기에서 후보를 만들면 이곳에 기록됩니다."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}
      <Text variant="body" tone="muted" style={styles.intro}>
        카드 꾸미기에서 만든 후보와 생성 옵션을 다시 확인할 수 있습니다.
      </Text>
      <TextLink label="새로고침" onPress={history.reload} align="end" style={styles.refresh} />

      <View style={styles.groups}>
        {history.data.groups.map((group) => (
          <ResourceGroup
            key={group.candidateGroupId ?? `${group.resourceType}-${group.candidates[0]?.id ?? 'empty'}`}
            group={group}
            selectedId={selectedId}
            onSelect={openDetail}
          />
        ))}
      </View>

      {selectedId ? (
        <Panel style={styles.detail}>
          <Text variant="heading">선택한 후보</Text>
          {detailLoading ? <Skeleton style={styles.detailPreview} /> : null}
          {detailError ? (
            <View style={styles.detailError}>
              <AlertCircle size={16} color={colors.text} />
              <Text variant="caption">{detailError}</Text>
            </View>
          ) : null}
          {selected ? <ResourceDetail resource={selected} /> : null}
        </Panel>
      ) : null}
    </Screen>
  );
}

function ResourceGroup({
  group,
  selectedId,
  onSelect,
}: {
  group: AiResourceGroup;
  selectedId: string | null;
  onSelect: (resource: AiResource) => void;
}) {
  const completed = group.candidates.filter((candidate) => candidate.status === 'COMPLETED').length;
  const first = group.candidates[0];

  return (
    <Panel>
      <View style={styles.groupHeader}>
        <Text variant="heading">{RESOURCE_LABELS[group.resourceType]}</Text>
        <Text variant="caption" tone="muted">
          {`${completed}/${group.candidateCount}개 완료`}
        </Text>
      </View>
      {first?.prompt ? (
        <Text variant="caption" tone="muted" numberOfLines={3} style={styles.prompt}>
          {`프롬프트 · ${first.prompt}`}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {group.candidates.map((candidate) => (
          <HistoryCandidate
            key={candidate.id}
            resource={candidate}
            selected={candidate.id === selectedId}
            onPress={() => onSelect(candidate)}
          />
        ))}
      </View>
    </Panel>
  );
}

function HistoryCandidate({
  resource,
  selected,
  onPress,
}: {
  resource: AiResource;
  selected: boolean;
  onPress: () => void;
}) {
  if (isPending(resource.status)) {
    return <Skeleton style={styles.tile} />;
  }

  if (resource.status !== 'COMPLETED') {
    return (
      <View style={[styles.tile, styles.statusTile]}>
        <AlertCircle size={18} color={colors.text} />
        <Text variant="caption" style={styles.statusText}>
          {statusLabel(resource.status)}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="AI 후보 상세 보기"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.selected, pressed && styles.pressed]}
    >
      <CandidateContent candidate={toCandidate(resource)} />
    </Pressable>
  );
}

function ResourceDetail({ resource }: { resource: AiResource }) {
  return (
      <View style={styles.detailBody}>
      <View style={styles.detailPreview}>
        {resource.generatedImageUrl ? (
          <AiImagePreview url={resource.generatedImageUrl} label="AI 리소스" />
        ) : (
          <CandidateContent candidate={toCandidate(resource)} />
        )}
      </View>
      <Text variant="caption" tone="muted">
        {`${RESOURCE_LABELS[resource.resourceType]} · ${statusLabel(resource.status)}`}
      </Text>
      {resource.prompt ? <Text variant="body" style={styles.detailText}>{resource.prompt}</Text> : null}
      {resource.aiModel ? (
        <Text variant="caption" tone="muted" style={styles.detailMeta}>
          {`모델 · ${resource.aiModel}`}
        </Text>
      ) : null}
      {resource.createdAt ? (
        <Text variant="caption" tone="muted" style={styles.detailMeta}>
          {`생성일 · ${formatPurchaseDate(resource.createdAt)}`}
        </Text>
      ) : null}
    </View>
  );
}

function statusLabel(status: AiResource['status']): string {
  switch (status) {
    case 'PENDING':
      return '생성 대기 중';
    case 'PROCESSING':
      return '생성 중';
    case 'COMPLETED':
      return '완료';
    case 'FAILED':
      return '생성 실패';
    case 'REJECTED':
      return '생성 거절';
    case 'ARCHIVED':
      return '보관됨';
  }
}

const styles = StyleSheet.create({
  head: { paddingTop: space[2] },
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  intro: { marginTop: space[4] },
  refresh: { marginTop: space[1] },
  loadingList: { marginTop: space[5], gap: space[4] },
  groupSkeleton: { height: 220, borderRadius: radius.base },
  groups: { marginTop: space[5], gap: space[4] },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prompt: { marginTop: space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[4] },
  tile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: radius.base,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSubtle,
  },
  selected: { borderWidth: 2, borderColor: colors.borderStrong },
  pressed: { opacity: 0.75 },
  statusTile: { alignItems: 'center', justifyContent: 'center', gap: space[2], padding: space[3] },
  statusText: { textAlign: 'center' },
  detail: { marginTop: space[5] },
  detailPreview: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 260,
    alignSelf: 'center',
    marginTop: space[4],
    marginBottom: space[3],
    borderRadius: radius.base,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSubtle,
  },
  detailBody: { marginTop: space[4] },
  detailText: { marginTop: space[3] },
  detailMeta: { marginTop: space[2] },
  detailError: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[4] },
});
