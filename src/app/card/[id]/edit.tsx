import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Palette, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { TemplateTile } from '@/components/card/template-tile';
import { CandidateGrid } from '@/components/customize/candidate-grid';
import { CardStage } from '@/components/customize/card-stage';
import { LayerInspector } from '@/components/customize/layer-inspector';
import { LayerList } from '@/components/customize/layer-list';
import { Button } from '@/components/ui/button';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Sheet, useSheetSpace } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import {
  DATA_RESOURCE_TYPES,
  RESOURCE_LABELS,
  RESOURCE_NOTES,
  isPending,
  type AiResourceType,
} from '@/lib/api/ai-resources';
import { fetchCardTemplates } from '@/lib/api/card-templates';
import { restoreOriginalCard } from '@/lib/api/customizations';
import { useCardDesign } from '@/lib/card-design';
import { useCard, useCards } from '@/lib/cards-store';
import type { Card, CardTemplate } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

const COLUMNS = 2;
/** 미리보기 카드의 폭. 상세보다 좁다 — 여기서는 카드가 주인공이 아니라 작업 대상이다. */
const PREVIEW_WIDTH = 220;

/**
 * 카드 꾸미기 — 하우스가 승인한 범위 안에서.
 *
 * 기획서 §8 이 자유로운 이미지 생성이 아니라 **승인된 템플릿·색·그래픽의 조합**이라고 못박은
 * 이유가 그대로 여기에 있다. 고객이 고르는 것은 디자인 그 자체가 아니라 어느 승인 디자인을
 * 쓸지이고, 그 안에서 AI 가 종류마다 후보 넷을 만든다.
 *
 * **한 라우트, 세 단계.** 고르기 → 후보 → 배치가 각각 화면이 되면 뒤로 가기가 취소인지
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

  const load = useCallback(() => fetchCardTemplates(), []);
  const templates = useResource<CardTemplate[]>(load);

  const usable = useMemo(
    () => (card ? usableTemplates(templates.data ?? [], card) : []),
    [templates.data, card],
  );

  const design = useCardDesign(card, usable);

  /**
   * **훅이 오류를 들고 있어도 아무도 읽지 않으면 화면은 조용하다.**
   *
   * 후보 생성이 400·409 로 거절당하면 `design.error` 에 서버의 한국어 문장이 들어가는데,
   * 그것을 그리는 자리가 어디에도 없어서 버튼을 눌러도 정말 아무 일도 일어나지 않는
   * 상태였다 — 실패한 줄도 모르는 화면은 실패하는 화면보다 나쁘다. 토스트로 받는 이유는
   * 세 단계가 한 라우트를 나눠 쓰기 때문이다: 어느 얼굴에서 실패하든 같은 자리에서 읽힌다.
   */
  const { error: designError, dismissError } = design;
  useEffect(() => {
    if (!designError) return;
    toast(designError);
    dismissError();
  }, [designError, dismissError, toast]);

  const nav = <NavBar title="카드 꾸미기" fallback="/" />;

  if (cardStatus !== 'loading' && !card) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
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
        <EmptyState
          icon={Palette}
          title="디자인을 불러오지 못했습니다"
          note={templates.error ?? '잠시 후 다시 시도해 주세요.'}
        />
      </Screen>
    );
  }

  if (design.phase === 'candidates') {
    return <CandidatesPane card={card} design={design} nav={nav} />;
  }

  if (design.phase === 'editor') {
    return <EditorPane card={card} design={design} nav={nav} />;
  }

  return (
    <ChoosePane
      card={card}
      templates={usable}
      nav={nav}
      onChoose={design.chooseTemplate}
      onRestored={() => {
        toast('원래 디자인으로 되돌렸습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      }}
      onRestoreFailed={() => toast('되돌리지 못했습니다.')}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * 1단계 — 어느 승인 디자인으로
 * ────────────────────────────────────────────────────────────────────────────── */

function ChoosePane({
  card,
  templates,
  nav,
  onChoose,
  onRestored,
  onRestoreFailed,
}: {
  card: Card;
  templates: CardTemplate[];
  nav: React.ReactNode;
  onChoose: (id: string) => void;
  onRestored: () => void;
  onRestoreFailed: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(card.template?.id ?? null);

  if (templates.length === 0) {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <EmptyState
          icon={Palette}
          title="적용할 수 있는 디자인이 아직 없습니다"
          note={`${card.brand.name} 가 승인한 카드 디자인이 준비되면\n여기에서 고르실 수 있습니다.`}
        />
      </Screen>
    );
  }

  const rows: (CardTemplate | null)[][] = [];
  for (let i = 0; i < templates.length; i += COLUMNS) {
    const row: (CardTemplate | null)[] = templates.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  const undo = () => {
    void (async () => {
      try {
        await restoreOriginalCard(card.id);
        onRestored();
      } catch {
        onRestoreFailed();
      }
    })();
  };

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}

      <Text variant="body" tone="muted" style={styles.intro}>
        {`${card.brand.name} 가 승인한 디자인 중에서 고르시면,\n그 안에서 카드에 올릴 것들을 만들어 드립니다.`}
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

      <Button
        label="다음"
        disabled={!picked}
        onPress={() => picked && onChoose(picked)}
        style={styles.action}
      />

      {/* 이미 꾸며둔 카드에만 나온다. 되돌릴 것이 없는데 되돌리기를 두면 그 버튼은 거짓말이다. */}
      {card.customization ? <TextLink label="원래 디자인으로 되돌리기" onPress={undo} /> : null}
    </Screen>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * 2단계 — 종류를 고르고, 후보 넷 중 하나를 고른다
 * ────────────────────────────────────────────────────────────────────────────── */

type Design = ReturnType<typeof useCardDesign>;

/**
 * 여덟 종류를 한 줄에 늘어놓을 방법은 없다.
 *
 * 칩 여덟 개는 화면 한 밴드를 통째로 먹고, 컬렉션 화면이 이미 같은 이유로 칩 행을 기각했다.
 * **드롭다운이 목록이고, 제목이 곧 지금 보고 있는 것**이라는 그 화면의 규약을 그대로 쓴다.
 * `group` 이 이미지와 스타일로 갈리는 것이 §5 의 구분을 고객에게 그대로 보여준다.
 */
function CandidatesPane({
  card,
  design,
  nav,
}: {
  card: Card;
  design: Design;
  nav: React.ReactNode;
}) {
  /* 첫 항목이 기본값이다. `BACKGROUND` 를 박아두면 상품 사진이 없는 카드에서 목록에 없는
     종류가 골라진 채로 화면이 열린다. */
  const [type, setType] = useState<AiResourceType>(design.generatableTypes[0] ?? 'DECORATION');
  const group = design.groups[type];
  const chosenCount = Object.keys(design.selected).length;

  /* 고를 수 있는 것만 세운다 — `PRODUCT_ANGLE` 은 폐지돼 400 이고, `BACKGROUND` 는 상품
     사진이 없으면 409 다. 실패가 예정된 항목을 목록에 두는 것은 목록이 아니라 함정이다. */
  const options: DropdownOption[] = [
    ...design.generatableTypes.map((t) => option(t, design, '그림')),
    ...DATA_RESOURCE_TYPES.map((t) => option(t, design, '스타일')),
  ];

  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}

      <View style={styles.pickerRow}>
        <Dropdown
          value={type}
          onValueChange={(next) => setType(next as AiResourceType)}
          options={options}
          accessibilityLabel="만들 종류 고르기"
        >
          <View style={styles.picker}>
            <Text variant="heading">{RESOURCE_LABELS[type]}</Text>
            <ChevronDown size={18} color={colors.text} />
          </View>
        </Dropdown>
      </View>

      <Text variant="caption" tone="muted" style={styles.note}>
        {RESOURCE_NOTES[type]}
      </Text>

      {group ? (
        <>
          <View style={styles.gridBlock}>
            <CandidateGrid
              candidates={group.candidates}
              selectedId={design.selected[type]}
              onSelect={(candidate) => design.select(type, candidate.id)}
            />
          </View>

          {group.slow && !group.expired ? (
            <Text variant="caption" tone="muted" style={styles.note}>
              예상보다 오래 걸리고 있습니다. 계속 만들고 있으니 다른 종류를 먼저 골라도 됩니다.
            </Text>
          ) : null}

          {/* 만드는 중에는 다시 만들 수 없다 — 누를 수 없는 버튼을 두는 대신 버튼을 두지 않는다.
              **빈 목록도 "만드는 중"이다.** `[].every()` 는 참이라, 이 검사만으로는 요청을
              보내고 첫 후보가 도착하기 전까지 다시 만들기가 떠 있었다. */}
          {group.candidates.length > 0 && group.candidates.every((c) => !isPending(c.status)) ? (
            <TextLink label="다시 만들기" onPress={() => design.generate(type)} />
          ) : null}
        </>
      ) : (
        <Button
          label={`${RESOURCE_LABELS[type]} 후보 만들기`}
          onPress={() => design.generate(type)}
          style={styles.action}
        />
      )}

      <View style={styles.footer}>
        <Text variant="caption" tone="muted">
          {chosenCount > 0 ? `${chosenCount}가지를 골랐습니다` : '고른 것이 없습니다'}
        </Text>
        <Button
          label="카드에 배치하기"
          disabled={chosenCount === 0}
          onPress={design.openEditor}
          style={styles.action}
        />
        <TextLink label="디자인 다시 고르기" onPress={design.reset} />
      </View>

      <Text variant="caption" tone="muted" style={styles.brandNote}>
        {`${card.brand.name} 가 승인한 범위 안에서 만들어집니다.`}
      </Text>
    </Screen>
  );
}

/** 드롭다운 한 줄. `hint` 가 그 그룹의 지금 상태를 말한다. */
function option(type: AiResourceType, design: Design, group: string): DropdownOption {
  const state = design.groups[type];
  const chosen = design.selected[type];

  const hint = chosen
    ? '고름'
    : !state
      ? '아직'
      : state.candidates.some((c) => isPending(c.status))
        ? '만드는 중'
        : `${state.candidates.filter((c) => c.status === 'COMPLETED').length}개`;

  return { value: type, label: RESOURCE_LABELS[type], hint, group };
}

/* ──────────────────────────────────────────────────────────────────────────────
 * 3단계 — 카드 위에 놓기
 * ────────────────────────────────────────────────────────────────────────────── */

function EditorPane({
  card,
  design,
  nav,
}: {
  card: Card;
  design: Design;
  nav: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const { loadCard } = useCards();
  const [saving, setSaving] = useState(false);
  const bottomSpace = useSheetSpace();

  const active = design.layers.find((l) => l.id === design.activeLayerId) ?? null;

  const imageForResource = useCallback(
    (resourceId: string) => {
      const found = design.candidates.find((c) => c.id === resourceId);
      return found?.kind === 'image' ? found.imageUrl : null;
    },
    [design.candidates],
  );

  const save = () => {
    setSaving(true);
    void (async () => {
      const result = await design.save();

      /* **실패하면 여기 남는다.** 문구는 화면 위쪽의 토스트가 이미 `design.error` 로 띄우고
         있으므로 여기서 한 번 더 말하지 않는다 — 고칠 수 있는 화면에 그대로 서 있는 것이
         "저장했다"고 말하며 나가버리는 것보다 언제나 낫다. */
      if (!result.ok) {
        setSaving(false);
        return;
      }

      /* 응답이 비어 있어도(202) 카드를 다시 불러 확인한다 — 서버가 이미 만들었을 수 있고,
         아직이라면 카드 상세가 그때의 상태를 보여준다. */
      await loadCard(card.id);
      setSaving(false);
      toast(
        result.customization
          ? '카드에 반영되었습니다'
          : '저장을 시작했습니다. 완료되면 카드에 반영됩니다.',
      );
      router.replace({ pathname: '/card/[id]', params: { id: card.id } });
    })();
  };

  return (
    <Screen gutter={false}>
      <View style={[styles.editor, { paddingBottom: bottomSpace }]}>
        {nav}

        <View style={styles.stage}>
          <CardStage
            card={card}
            layers={design.layers}
            activeId={design.activeLayerId}
            interactive
            imageForResource={imageForResource}
            onSelect={design.setActiveLayerId}
            onCommitFrame={(id, frame) => design.updateLayer(id, { frame })}
          />
        </View>

        <View style={styles.inspector}>
          <LayerInspector
            layer={active}
            onChange={(patch) => active && design.updateLayer(active.id, patch)}
            onRemove={() => active && design.removeLayer(active.id)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => design.addLayer('TEXT', { text: '' })}
          style={styles.add}
        >
          <Plus size={16} color={colors.text} />
          <Text variant="action">글자 넣기</Text>
        </Pressable>

        <Input
          label="카드에 새길 한 줄"
          value={design.message}
          onChangeText={design.setMessage}
          placeholder="예: 첫 서울 여행에서"
          maxLength={200}
          style={styles.field}
        />

        {design.blockedReason ? (
          <Text variant="caption" style={styles.note}>
            {design.blockedReason}
          </Text>
        ) : null}

        <Button
          label="이 디자인으로 저장"
          loading={saving}
          disabled={!design.canSave}
          onPress={save}
          style={styles.action}
        />
        <TextLink label="후보 다시 고르기" onPress={design.backToCandidates} />
      </View>

      {/* 무엇이 몇 겹으로 올라가 있는지는 이 화면의 주제가 아니라 그 옆의 사실이다 — 시트가
          정확히 그런 것을 위한 표면이고, 열려 있어도 카드가 그대로 보인다. */}
      <Sheet title="레이어">
        <LayerList
          layers={design.layers}
          activeId={design.activeLayerId}
          onSelect={design.setActiveLayerId}
          onToggleVisible={(layerId) => {
            const layer = design.layers.find((l) => l.id === layerId);
            if (layer) design.updateLayer(layerId, { visible: !layer.visible });
          }}
          onMove={design.reorderLayer}
        />
      </Sheet>
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
 * 카드 종류와 다르면 뺀다 — **고를 수 없는 선택지는 선택지가 아니다.**
 */
function usableTemplates(templates: CardTemplate[], card: Card): CardTemplate[] {
  return templates.filter((t) => {
    if (t.brandId !== card.brand.id) return false;
    if (t.allowedCardType && t.allowedCardType !== card.cardType) return false;
    return true;
  });
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  head: { paddingTop: space[2] },
  intro: { marginTop: space[4] },
  grid: { marginTop: space[5], gap: space[5], ...allowPressOverflow },
  gridBlock: { marginTop: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
  tileSkeleton: { flex: 1, aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  field: { marginTop: space[4] },
  action: { marginTop: space[4] },
  note: { marginTop: space[3] },
  brandNote: { marginTop: space[5], textAlign: 'center' },

  pickerRow: { marginTop: space[5], flexDirection: 'row' },
  picker: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  footer: { marginTop: space[6] },

  /* 편집기는 스크롤하지 않는다 — 무대의 드래그와 화면의 스크롤이 같은 손짓을 두 가지 뜻으로
     쓰게 되고, 레이어를 아래로 끌면 화면이 같이 내려간다. */
  editor: { flex: 1, paddingHorizontal: space[4], paddingTop: space[2] },
  stage: { width: '100%', maxWidth: PREVIEW_WIDTH, alignSelf: 'center', marginTop: space[4] },
  inspector: { marginTop: space[4] },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
  },
});
