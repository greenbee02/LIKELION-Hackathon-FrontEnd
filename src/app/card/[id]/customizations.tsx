import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Check, History } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { CardLayerStack } from '@/components/card/card-layer-stack';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { NavBar } from '@/components/ui/nav-bar';
import { Panel } from '@/components/ui/panel';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import { failureMessage } from '@/lib/api/errors';
import {
  fetchCustomizations,
  restoreOriginalCard,
  selectCustomization,
} from '@/lib/api/customizations';
import { imageSource } from '@/lib/card-art';
import { useCard, useCards } from '@/lib/cards-store';
import { formatPurchaseDate } from '@/lib/format';
import type { CardCustomization } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 이 카드를 꾸민 기록 — 그리고 그중 하나를 다시 고르거나 처음으로 되돌리는 곳.
 *
 * **꾸미기는 덮어쓰기가 아니다.** 합성할 때마다 `card_customizations` 에 한 벌이 남고, 카드는
 * 그중 하나를 얼굴로 고르고 있을 뿐이다. 그래서 되돌리기가 삭제가 아니라 선택 해제이고,
 * 어제 만든 것으로 다시 갈아입는 일이 가능하다. 그 사실이 화면으로 존재하지 않으면 고객은
 * 자기가 만든 것을 잃었다고 생각한다.
 *
 * 편집 화면과 나눈 이유: 저쪽은 **만드는** 곳이고 이쪽은 **고르는** 곳이다. 한 화면에 두면
 * 뒤로 가기가 무엇을 취소하는지 알 수 없어진다.
 */
export default function CustomizationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status: cardStatus } = useCard(id);
  const { loadCard } = useCards();
  const router = useRouter();
  const toast = useToast();

  const load = useCallback(async (): Promise<CardCustomization[]> => {
    if (!id) return [];
    return fetchCustomizations(id);
  }, [id]);
  const history = useResource<CardCustomization[]>(load);

  const [restoring, setRestoring] = useState(false);
  const [busy, setBusy] = useState(false);

  const nav = <NavBar title="꾸민 기록" fallback="/" />;

  if (cardStatus === 'loading' || history.status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <View style={styles.list}>
          <Skeleton style={styles.rowSkeleton} />
          <Skeleton style={styles.rowSkeleton} />
        </View>
      </Screen>
    );
  }

  if (!card) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={History}
          title="카드를 찾을 수 없습니다"
          note="삭제되었거나 잘못된 주소입니다."
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  if (history.status === 'error') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={History}
          title="기록을 불러오지 못했습니다"
          note={history.error ?? '잠시 후 다시 시도해 주세요.'}
          action={{ label: '다시 시도', onPress: history.reload }}
        />
      </Screen>
    );
  }

  /* 서버가 순서를 약속하지 않았으므로 최근 것이 위로 오게 우리가 정렬한다. */
  const made = [...(history.data ?? [])].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  if (made.length === 0) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={History}
          title="아직 꾸민 기록이 없습니다"
          note="카드를 꾸미면 만든 것들이 여기 쌓이고, 언제든 다시 골라 입힐 수 있습니다."
          action={{
            label: '카드 꾸미기',
            onPress: () => router.push({ pathname: '/card/[id]/edit', params: { id: card.id } }),
          }}
        />
      </Screen>
    );
  }

  const apply = (customization: CardCustomization) => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      try {
        await selectCustomization(card.id, customization.id);
        await loadCard(card.id);
        toast('이 디자인을 적용했습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      } catch (e) {
        toast(failureMessage(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  const restore = () => {
    setRestoring(false);
    setBusy(true);
    void (async () => {
      try {
        await restoreOriginalCard(card.id);
        await loadCard(card.id);
        toast('원래 디자인으로 되돌렸습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      } catch (e) {
        toast(failureMessage(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}

      <Text variant="body" tone="muted" style={styles.intro}>
        만든 디자인은 지워지지 않습니다. 언제든 다시 골라 입힐 수 있습니다.
      </Text>

      <View style={styles.list}>
        {made.map((customization) => (
          <CustomizationRow
            key={customization.id}
            customization={customization}
            current={card.customization?.id === customization.id}
            onPress={() => apply(customization)}
          />
        ))}
      </View>

      {/* 되돌릴 것이 있을 때만. 이미 원래 얼굴인 카드에 되돌리기를 두면 그 버튼은 거짓말이다. */}
      {card.customization ? (
        <View style={styles.footer}>
          <TextLink label="원래 디자인으로 되돌리기" onPress={() => setRestoring(true)} />
        </View>
      ) : null}

      <Dialog
        open={restoring}
        onOpenChange={setRestoring}
        title="원래 디자인으로 되돌릴까요?"
        description={
          '발급 때의 얼굴로 돌아갑니다.\n만든 기록은 그대로 남아 있어 언제든 다시 고를 수 있습니다.'
        }
        confirmLabel="되돌리기"
        onConfirm={restore}
      />
    </Screen>
  );
}

/**
 * 기록 한 줄.
 *
 * 썸네일이 없을 수 있다 — 목에서는 늘 그렇고, 실서버에서도 합성이 아직 끝나지 않았으면
 * 그렇다. 그럴 때 빈 사각형을 그리는 대신 상태를 말한다: 만드는 중인지, 실패했는지.
 */
function CustomizationRow({
  customization,
  current,
  onPress,
}: {
  customization: CardCustomization;
  current: boolean;
  onPress: () => void;
}) {
  const source = imageSource(customization.frontImageUrl);
  const layers = customization.layers;
  const pending = customization.status === 'PENDING' || customization.status === 'PROCESSING';
  const failed = customization.status === 'FAILED';

  const body = (
    <Panel style={styles.row}>
      <View style={styles.thumb}>
        {/* 승인 에셋으로 만든 것은 이미지가 없다 — 카드 얼굴과 같은 방식으로 여기서도 겹친다.
            64pt 짜리 문구는 읽히지 않지만, 무엇을 골랐는지는 배경과 테두리가 이미 말한다. */}
        {layers.length > 0 ? (
          <CardLayerStack layers={layers} />
        ) : source ? (
          <Image source={source} style={styles.thumbImage} contentFit="cover" transition={200} />
        ) : pending ? (
          <Skeleton style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbBlank} />
        )}
      </View>

      <View style={styles.rowBody}>
        <Text variant="label">{formatPurchaseDate(customization.createdAt)}</Text>
        {/* 값 없는 행은 그리지 않는다 — 메시지 없이 만든 카드가 대부분이다. */}
        {customization.message ? (
          <Text variant="caption" tone="muted" numberOfLines={2} style={styles.message}>
            {customization.message}
          </Text>
        ) : null}
        {failed ? (
          <View style={styles.failed}>
            <AlertCircle size={14} color={colors.text} />
            <Text variant="caption">만들지 못했습니다</Text>
          </View>
        ) : null}
      </View>

      {current ? <Check size={18} color={colors.text} strokeWidth={2.5} /> : null}
    </Panel>
  );

  /* 지금 쓰고 있는 것과 만들다 만 것은 누를 수 없다. 누를 수 없는 것을 눌리게 두면 아무 일도
     일어나지 않는 탭이 생기고, 고객은 그것을 고장으로 읽는다. */
  if (current || pending || failed) return body;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="이 디자인 적용" onPress={onPress}>
      {body}
    </Pressable>
  );
}

const THUMB = 64;

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  head: { paddingTop: space[2] },
  intro: { marginTop: space[4] },
  list: { marginTop: space[5], gap: space[3], ...allowPressOverflow },
  rowSkeleton: { height: 96, borderRadius: radius.base },

  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  thumb: { width: THUMB, aspectRatio: CARD_ASPECT, borderRadius: radius.small, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbBlank: { width: '100%', height: '100%', backgroundColor: colors.surface },
  rowBody: { flex: 1 },
  message: { marginTop: space[1] },
  failed: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[1] },
  footer: { marginTop: space[6], alignItems: 'center' },
});
