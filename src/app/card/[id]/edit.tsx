import { useLocalSearchParams, useRouter } from 'expo-router';
import { Palette } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT, CardFace } from '@/components/card/card-face';
import { TemplateTile } from '@/components/card/template-tile';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Checklist } from '@/components/ui/checklist';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import { RESOURCE_LABELS } from '@/lib/api/ai-resources';
import { fetchCardTemplates } from '@/lib/api/card-templates';
import { restoreOriginalCard } from '@/lib/api/customizations';
import { useCardDesign } from '@/lib/card-design';
import { useCard } from '@/lib/cards-store';
import { USE_MOCK } from '@/lib/config';
import { MOCK_CARD_TEMPLATES } from '@/lib/mock/card-templates';
import { mockRestoreOriginal } from '@/lib/mock/customizations';
import type { Card, CardTemplate } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

const COLUMNS = 2;
/** 미리보기 카드의 폭. 상세의 280 보다 좁다 — 여기서는 카드가 주인공이 아니라 결과물이다. */
const PREVIEW_WIDTH = 220;

/**
 * 카드 꾸미기 — 하우스가 승인한 범위 안에서.
 *
 * 기획서 §8 이 자유로운 이미지 생성이 아니라 **승인된 템플릿·색·그래픽의 조합**이라고 못박은
 * 이유가 그대로 여기에 있다. 고객이 고르는 것은 디자인 그 자체가 아니라 어느 승인 디자인을
 * 쓸지이고, 그 안에서 AI 가 장식·색 조합·글자 모양·구성 넷을 만든다.
 *
 * **한 라우트, 세 단계.** 고르기 → 만들기 → 미리보기가 각각 화면이 되면 뒤로 가기가 취소인지
 * 되돌리기인지 알 수 없어지고, 생성 중에 뒤로 갔다 오면 무엇이 남아 있는지도 흐려진다.
 * 하나의 화면이 세 얼굴을 갖는 편이 정확하다.
 *
 * **여기서 "AI" 라고 부르는 것은 진짜 AI 이기 때문이다.** 요청은 실제로 생성 모델을 태우고,
 * 그래서 실제로 몇 초가 걸린다. 컬렉션 제안 쪽이 그 말을 쓰지 않는 것과 짝을 이룬다 — 규칙을
 * AI 라고 부르기 시작하면 진짜인 이쪽까지 같은 말이 되어 둘 다 신뢰를 잃는다.
 */
export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status: cardStatus } = useCard(id);
  const router = useRouter();
  const toast = useToast();

  const load = useCallback(async (): Promise<CardTemplate[]> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_CARD_TEMPLATES;
    }
    return fetchCardTemplates();
  }, []);
  const templates = useResource<CardTemplate[]>(load);

  const design = useCardDesign(id ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const [engraving, setEngraving] = useState('');
  const [saving, setSaving] = useState(false);

  const nav = (
    <View style={styles.nav}>
      <BackButton fallback="/" />
    </View>
  );
  const header = <PageHeader title="카드 꾸미기" />;

  if (cardStatus !== 'loading' && !card) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <EmptyState
          icon={Palette}
          title="카드를 찾을 수 없습니다"
          note="삭제되었거나 잘못된 주소입니다."
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  if (!card || cardStatus === 'loading' || templates.status === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <View style={styles.grid}>
          <View style={styles.row}>
            <Skeleton style={styles.tileSkeleton} />
            <Skeleton style={styles.tileSkeleton} />
          </View>
        </View>
      </Screen>
    );
  }

  if (templates.status === 'error') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <EmptyState
          icon={Palette}
          title="디자인을 불러오지 못했습니다"
          note={templates.error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  const usable = usableTemplates(templates.data ?? [], card);

  if (design.phase === 'generating') {
    return (
      <Generating
        card={card}
        nav={nav}
        header={header}
        resources={design.resources}
        slow={design.slow}
        onLeave={() => router.replace({ pathname: '/card/[id]', params: { id: card.id } })}
      />
    );
  }

  if (design.phase === 'preview') {
    const save = () => {
      setSaving(true);
      void (async () => {
        const made = await design.save(engraving.trim() || undefined);
        setSaving(false);
        if (!made) return toast('저장하지 못했습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      })();
    };

    return (
      <Screen scroll contentContainerStyle={styles.head}>
        {nav}
        {header}
        <View style={styles.preview}>
          <CardFace card={card} />
        </View>
        <Text variant="body" tone="muted" style={styles.previewNote}>
          {design.resources.some((r) => r.status === 'FAILED')
            ? '일부는 만들지 못했습니다. 만들어진 것만으로 완성합니다.'
            : '만들어진 요소로 카드를 완성합니다.'}
        </Text>
        <Button label="이 디자인으로 저장" loading={saving} onPress={save} style={styles.action} />
        <TextLink label="다시 고르기" onPress={design.reset} />
      </Screen>
    );
  }

  if (usable.length === 0) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        {header}
        <EmptyState
          icon={Palette}
          title="적용할 수 있는 디자인이 아직 없습니다"
          note={`${card.brand.name} 가 승인한 카드 디자인이 준비되면\n여기에서 고르실 수 있습니다.`}
        />
      </Screen>
    );
  }

  const rows: (CardTemplate | null)[][] = [];
  for (let i = 0; i < usable.length; i += COLUMNS) {
    const row: (CardTemplate | null)[] = usable.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  const undo = () => {
    void (async () => {
      try {
        if (USE_MOCK) mockRestoreOriginal(card.id);
        else await restoreOriginalCard(card.id);
        toast('원래 디자인으로 되돌렸습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      } catch {
        toast('되돌리지 못했습니다.');
      }
    })();
  };

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}
      {header}

      <Text variant="body" tone="muted" style={styles.intro}>
        {`${card.brand.name} 가 승인한 디자인 중에서 고르시면,\n구매 정보에 맞춰 카드를 만들어 드립니다.`}
      </Text>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={row[0]?.id ?? `row-${rowIndex}`} style={styles.row}>
            {row.map((template, index) =>
              template ? (
                <TemplateTile
                  key={template.id}
                  template={template}
                  selected={picked === template.id}
                  current={card.template?.id === template.id}
                  onPress={() => setPicked(template.id)}
                />
              ) : (
                <View key={`blank-${index}`} style={styles.blank} />
              ),
            )}
          </View>
        ))}
      </View>

      {/* 카드에 새길 한 줄. 없어도 되므로 필수가 아니고, 그래서 라벨에 별표가 없다. */}
      <Input
        label="카드에 새길 한 줄"
        value={engraving}
        onChangeText={setEngraving}
        placeholder="예: 첫 서울 여행에서"
        maxLength={30}
        style={styles.field}
      />

      <Button
        label="만들기"
        disabled={!picked}
        onPress={() => picked && design.start(picked)}
        style={styles.action}
      />

      {/* 이미 꾸며둔 카드에만 나온다. 되돌릴 것이 없는데 되돌리기를 두면 그 버튼은 거짓말이다. */}
      {card.customization ? <TextLink label="원래 디자인으로 되돌리기" onPress={undo} /> : null}
    </Screen>
  );
}

/**
 * 이 카드에 붙일 수 있는 디자인만.
 *
 * **브랜드가 다르면 뺀다.** 이것이 "하우스가 승인한"의 실제 뜻이고, 발급 에러코드에
 * `TEMPLATE_BRAND_MISMATCH` 가 있는 것이 그 근거다. 다른 하우스의 디자인을 입은 카드는
 * 누구의 카드도 아니게 된다.
 *
 * `allowedCardType` 이 `null` 이면 제한이 없다는 뜻이고, 지금 시드는 셋 다 그렇다. 값이 있는데
 * 카드 종류와 다르면 뺀다 — **고를 수 없는 선택지는 선택지가 아니다.** 회색으로 그려두면 왜
 * 못 고르는지 설명할 자리가 필요해지고, 그 설명은 고객이 어쩔 수 없는 사실이다.
 */
function usableTemplates(templates: CardTemplate[], card: Card): CardTemplate[] {
  return templates.filter((t) => {
    if (t.brandId !== card.brand.id) return false;
    if (t.allowedCardType && t.allowedCardType !== card.cardType) return false;
    return true;
  });
}

/**
 * 만들어지는 동안.
 *
 * 발급 화면과 같은 모양이고 같은 이유다 — 넷이 따로 만들어지고 서로 다른 시각에 끝나므로,
 * 이름을 붙여 하나씩 정착시키는 것이 스피너 하나보다 정직하다.
 *
 * 오래 걸리면 나갈 길이 열린다. 붙잡아두는 것이 아니라 기다릴 만해서 기다리게 하는 것이고,
 * 나가더라도 서버는 계속 만든다 — 돌아오면 끝나 있다.
 */
function Generating({
  card,
  nav,
  header,
  resources,
  slow,
  onLeave,
}: {
  card: Card;
  nav: React.ReactNode;
  header: React.ReactNode;
  resources: ReturnType<typeof useCardDesign>['resources'];
  slow: boolean;
  onLeave: () => void;
}) {
  return (
    <Screen contentContainerStyle={styles.head}>
      {nav}
      {header}
      <View style={styles.preview}>
        <CardFace card={card} />
      </View>
      <View style={styles.checklist}>
        <Checklist
          items={resources.map((r) => ({
            key: r.type,
            label: RESOURCE_LABELS[r.type],
            status:
              r.status === 'COMPLETED' ? 'done' : r.status === 'PENDING' ? 'pending' : 'failed',
          }))}
        />
      </View>
      {slow ? (
        <TextLink label="나중에 확인하기" onPress={onLeave} />
      ) : (
        <Text variant="caption" tone="muted" style={styles.wait}>
          잠시만 기다려 주세요
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  head: { paddingTop: space[2] },
  nav: { flexDirection: 'row' },
  intro: { marginTop: space[4] },
  grid: { marginTop: space[5], gap: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
  tileSkeleton: { flex: 1, aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  field: { marginTop: space[6] },
  action: { marginTop: space[6] },

  preview: { width: '100%', maxWidth: PREVIEW_WIDTH, alignSelf: 'center', marginTop: space[5] },
  previewNote: { marginTop: space[5], textAlign: 'center' },
  checklist: { marginTop: space[6] },
  wait: { marginTop: space[5], textAlign: 'center' },
});
