import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardFace } from '@/components/card/card-face';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useCards } from '@/lib/cards-store';
import { useCollections } from '@/lib/collections-store';
import { suggestCollections, type CollectionSuggestion } from '@/lib/suggestions';
import type { Card } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 미리보기에 세우는 카드 수. 넷을 넘기면 제안 하나가 화면 한 장이 된다. */
const PREVIEW = 4;

/**
 * 묶을 거리 — 가진 카드에서 찾은 묶음 후보.
 *
 * **"AI 제안"이라 부르지 않는다.** 하는 일은 도시·하우스·시즌·세트가 겹치는 카드를 모으는
 * 것이고, 그건 규칙이지 모델이 아니다. 대신 제안마다 왜 묶였는지를 적는다 — 근거를 댈 수 있는
 * 추천은 근거가 곧 이름이 되고, 규칙 기반이라는 사실이 약점이 아니라 설명이 된다.
 *
 * 고르면 그 자리에서 컬렉션이 되고 방금 만든 것 안으로 들어간다. 이름은 묶인 축의 이름을
 * 그대로 쓰되, 마음에 안 들면 편집에서 바꾸면 된다 — 이름 짓기를 먼저 요구하면 제안을
 * 받아들이는 데 입력 한 단계가 끼어든다.
 */
export default function SuggestScreen() {
  const { cards } = useCards();
  const { create, setCards } = useCollections();
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => suggestCollections(cards), [cards]);
  const { status, data, error } = useResource<CollectionSuggestion[]>(load);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/collection" />
    </View>
  );
  const header = <PageHeader title="묶을 거리" />;

  const accept = (suggestion: CollectionSuggestion) => {
    setSaving(suggestion.key);
    void (async () => {
      const made = await create({ name: suggestion.name });
      if (!made) {
        setSaving(null);
        toast('컬렉션을 만들지 못했습니다.');
        return;
      }
      await setCards(made.id, suggestion.cardIds);
      router.replace({ pathname: '/collection/[id]', params: { id: made.id } });
    })();
  };

  if (status === 'error') {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        {header}
        <EmptyState
          icon={Sparkles}
          title="제안을 만들지 못했습니다"
          note={error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (status === 'loading') {
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

  const suggestions = data ?? [];

  if (suggestions.length === 0) {
    return (
      <Screen contentContainerStyle={styles.content}>
        {nav}
        {header}
        <EmptyState
          icon={Sparkles}
          title="묶을 만한 카드가 아직 적습니다"
          note={'같은 도시나 같은 시즌의 카드가 두 장 모이면\n여기에 묶음이 나타납니다.'}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {nav}
      {header}

      <View style={styles.list}>
        {suggestions.map((suggestion) => (
          <Panel key={suggestion.key}>
            <Text variant="heading">{suggestion.name}</Text>
            <Text variant="caption" tone="muted" style={styles.reason}>
              {suggestion.reason}
            </Text>

            {/* 무엇이 묶이는지 보여준다. 이름과 장수만 적으면 고객은 자기 카드 중 어느 것이
                들어가는지 모른 채 결정해야 한다. */}
            <View style={styles.preview}>
              {suggestion.cardIds.slice(0, PREVIEW).map((id) => {
                const card = cards.find((c): c is Card => c.id === id);
                return (
                  <View key={id} style={styles.previewItem}>
                    {card ? <CardFace card={card} /> : null}
                  </View>
                );
              })}
              {suggestion.cardIds.length > PREVIEW ? (
                <Text variant="caption" tone="muted" style={styles.more}>
                  {`+${suggestion.cardIds.length - PREVIEW}`}
                </Text>
              ) : null}
            </View>

            <Button
              label="이대로 만들기"
              variant="outline"
              loading={saving === suggestion.key}
              onPress={() => accept(suggestion)}
              style={styles.accept}
            />
          </Panel>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: space[2] },
  nav: { flexDirection: 'row' },
  list: { marginTop: space[4], gap: space[5], ...allowPressOverflow },
  reason: { marginTop: space[1] },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[4] },
  /** 36pt 폭의 얼굴 넷. 무엇이 담기는지 알아볼 만큼이되 목록이 되지는 않는 크기. */
  previewItem: { width: 36 },
  more: { marginLeft: space[1] },
  accept: { marginTop: space[4] },
  panelSkeleton: { height: 200, borderRadius: radius.base },
});
