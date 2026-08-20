import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ImageOff, Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AiImagePreview } from '@/components/customize/ai-image-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { fetchCustomizations } from '@/lib/api/customizations';
import type { CardCustomization } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** AI 합성 결과만 크게 확인하고 앞면·뒷면 이미지를 저장하는 화면. */
export default function AiResultScreen() {
  const { id, customizationId } = useLocalSearchParams<{
    id: string;
    customizationId?: string;
  }>();
  const load = useCallback(() => fetchCustomizations(id ?? ''), [id]);
  const history = useResource<CardCustomization[]>(load);
  const [side, setSide] = useState<'front' | 'back'>('front');

  const customization =
    history.data?.find((item) => item.id === customizationId) ??
    history.data?.find((item) => Boolean(item.frontImageUrl || item.backImageUrl));

  const nav = <NavBar title="AI 합성 결과" fallback={`/card/${id}`} />;

  if (history.status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <Skeleton style={styles.resultSkeleton} />
      </Screen>
    );
  }

  if (history.status === 'error') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={Sparkles}
          title="합성 결과를 불러오지 못했습니다"
          note={history.error ?? '잠시 후 다시 시도해 주세요.'}
          action={{ label: '다시 불러오기', onPress: history.reload }}
        />
      </Screen>
    );
  }

  if (!customization) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={ImageOff}
          title="합성 결과를 준비 중입니다"
          note="AI 생성이 끝나면 이 화면에서 앞면과 뒷면을 확인할 수 있습니다."
          action={{ label: '새로고침', onPress: history.reload }}
        />
      </Screen>
    );
  }

  const url = side === 'front' ? customization.frontImageUrl : customization.backImageUrl;
  const completed = customization.status === 'COMPLETED' && Boolean(url);

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}
      <Text variant="body" tone="muted" style={styles.intro}>
        합성된 카드 이미지를 앞면과 뒷면으로 나누어 확인하고 저장할 수 있습니다.
      </Text>

      <View style={styles.switcher}>
        {(['front', 'back'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: side === value }}
            onPress={() => setSide(value)}
            style={[styles.switch, side === value && styles.switchActive]}
          >
            {side === value ? <CheckCircle2 size={16} color={colors.text} /> : null}
            <Text variant="label">{value === 'front' ? '앞면' : '뒷면'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.resultFrame}>
        {completed && url ? (
          <AiImagePreview url={url} label={`AI 카드 ${side === 'front' ? '앞면' : '뒷면'}`} />
        ) : (
          <View style={styles.waiting}>
            <Sparkles size={28} color={colors.borderStrong} />
            <Text variant="body" tone="muted">
              {statusLabel(customization.status)}
            </Text>
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted" style={styles.status}>
        {`상태 · ${statusLabel(customization.status)}`}
      </Text>
      <TextLink label="결과 새로고침" onPress={history.reload} style={styles.refresh} />
    </Screen>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return '완료';
    case 'PENDING':
      return '생성 대기 중';
    case 'PROCESSING':
      return '생성 중';
    case 'FAILED':
      return '생성 실패';
    default:
      return status || '확인 중';
  }
}

const styles = StyleSheet.create({
  head: { paddingTop: space[2] },
  content: { paddingTop: space[2], paddingBottom: space[7] },
  intro: { marginTop: space[4] },
  switcher: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[5],
    padding: space[1],
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  switch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingVertical: space[3],
    borderRadius: radius.small,
  },
  switchActive: { backgroundColor: colors.background },
  resultFrame: {
    width: '100%',
    aspectRatio: 1000 / 1586,
    marginTop: space[5],
    borderRadius: radius.base,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSubtle,
  },
  resultSkeleton: {
    width: '100%',
    aspectRatio: 1000 / 1586,
    marginTop: space[5],
    borderRadius: radius.base,
  },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },
  status: { marginTop: space[3], textAlign: 'center' },
  refresh: { marginTop: space[2] },
});
