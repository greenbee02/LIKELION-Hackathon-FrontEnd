import { useLocalSearchParams, useRouter } from 'expo-router';
import { Palette, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARD_ASPECT } from '@/components/card/card-face';
import { CandidateGrid } from '@/components/customize/candidate-grid';
import { CardStage } from '@/components/customize/card-stage';
import { LayerInspector } from '@/components/customize/layer-inspector';
import { LayerList } from '@/components/customize/layer-list';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
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
import { isPending, type AiResourceType } from '@/lib/api/ai-resources';
import { useCardDesign } from '@/lib/card-design';
import { useCard, useCards } from '@/lib/cards-store';
import type { Card } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 미리보기 카드의 폭. 상세보다 좁다 — 여기서는 카드가 주인공이 아니라 작업 대상이다. */
const PREVIEW_WIDTH = 220;

type AiOptionField = {
  key: string;
  label: string;
  placeholder: string;
  /** 눌러서 고를 수 있는 말들. 그대로 서버로 가는 값이라 라벨과 값이 같다. */
  choices: readonly string[];
};

/**
 * 한 번에 만드는 후보 수 — 셋으로 굳었고, 화면에는 나오지 않는다.
 *
 * 고르라고 물어봤을 때 얻는 것이 없는 질문이었다. 셋과 넷 사이에는 고객이 고를 만한 차이가
 * 없고(둘 다 "몇 개 중에 고른다"이다), 대신 넷은 눈에 띄게 오래 걸린다. 물어보지 않는 편이
 * 빠르고, 화면도 한 줄 가벼워진다.
 */
const CANDIDATE_COUNT = 3 as const;

/**
 * 종류마다 물어보는 것들.
 *
 * **고르는 것이 기본이고 적는 것이 예외다.** 빈 상자 다섯 개를 세워두면 대충 만들어보려던
 * 사람이 할 일이 다섯 번 생각하는 것이 되고, 그러면 대개 아무것도 적지 않은 채로 만들기를
 * 누른다. 서넛의 말이 놓이면 고르는 데 한 번의 손짓이 들고, 그 말들이 동시에 "이 칸은 이런
 * 것을 묻습니다"라는 설명이 된다. 그래도 자기 말을 쓰고 싶은 사람을 위해 마지막 칩이
 * 「직접 입력」이다.
 */
const AI_OPTION_FIELDS: Record<AiResourceType, readonly AiOptionField[]> = {
  BACKGROUND: [
    {
      key: 'mood',
      label: '분위기',
      placeholder: '예: 차분한 밤, 따뜻한 오후',
      choices: ['차분한 밤', '따뜻한 오후', '도시의 새벽'],
    },
    {
      key: 'color',
      label: '색감',
      placeholder: '예: 딥 네이비, 모노톤',
      choices: ['딥 네이비', '모노톤', '웜 베이지'],
    },
    {
      key: 'texture',
      label: '질감',
      placeholder: '예: 종이 질감, 부드러운 그라데이션',
      choices: ['종이 질감', '부드러운 그라데이션', '매끄러운 광택'],
    },
  ],
  BORDER: [
    {
      key: 'shape',
      label: '모양',
      placeholder: '예: 얇은 선, 둥근 모서리',
      choices: ['얇은 선', '둥근 모서리', '각진 프레임'],
    },
    {
      key: 'color',
      label: '색감',
      placeholder: '예: 실버, 따뜻한 브라운',
      choices: ['실버', '따뜻한 브라운', '샴페인 골드'],
    },
  ],
  PATTERN: [
    {
      key: 'motif',
      label: '모티프',
      placeholder: '예: 기하학, 잎사귀',
      choices: ['기하학', '잎사귀', '물결'],
    },
    {
      key: 'density',
      label: '밀도',
      placeholder: '예: 여백 많게, 촘촘하게',
      choices: ['여백 많게', '촘촘하게', '균일하게'],
    },
    {
      key: 'color',
      label: '색감',
      placeholder: '예: 흑백, 낮은 채도',
      choices: ['흑백', '낮은 채도', '톤온톤'],
    },
  ],
  PRODUCT_ANGLE: [],
  DECORATION: [
    {
      key: 'subject',
      label: '주제',
      placeholder: '예: 작은 별, 리본',
      choices: ['작은 별', '리본', '꽃잎'],
    },
    {
      key: 'mood',
      label: '분위기',
      placeholder: '예: 우아하게, 장난스럽게',
      choices: ['우아하게', '장난스럽게', '담백하게'],
    },
    {
      key: 'color',
      label: '색감',
      placeholder: '예: 골드, 파스텔',
      choices: ['골드', '파스텔', '모노톤'],
    },
  ],
  COLOR_PALETTE: [
    {
      key: 'mood',
      label: '분위기',
      placeholder: '예: 고요한 새벽, 빈티지',
      choices: ['고요한 새벽', '빈티지', '선명한 대비'],
    },
    {
      key: 'temperature',
      label: '색온도',
      placeholder: '예: 따뜻하게, 차갑게',
      choices: ['따뜻하게', '차갑게', '중성적으로'],
    },
  ],
  TEXT_STYLE: [
    {
      key: 'fontStyle',
      label: '글꼴 분위기',
      placeholder: '예: 클래식 세리프, 모던 산세리프',
      choices: ['클래식 세리프', '모던 산세리프', '손글씨'],
    },
    {
      key: 'weight',
      label: '굵기',
      placeholder: '예: 가볍게, 또렷하게',
      choices: ['가볍게', '또렷하게', '굵게'],
    },
    {
      key: 'alignment',
      label: '정렬',
      placeholder: '예: 가운데, 왼쪽',
      choices: ['가운데', '왼쪽', '오른쪽'],
    },
  ],
  COMPOSITION: [
    {
      key: 'layout',
      label: '배치',
      placeholder: '예: 중앙 집중, 비대칭',
      choices: ['중앙 집중', '비대칭', '위아래 분할'],
    },
    {
      key: 'emphasis',
      label: '강조 대상',
      placeholder: '예: 상품을 크게, 여백을 강조',
      choices: ['상품을 크게', '여백을 강조', '문구를 앞으로'],
    },
  ],
};

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

  const design = useCardDesign(card);

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
      <Screen header={nav}>
        <EmptyState
          icon={Palette}
          title="카드를 찾을 수 없습니다"
          note="삭제되었거나 잘못된 주소입니다."
          action={{ label: '컬렉션으로 가기', onPress: () => router.replace('/') }}
        />
      </Screen>
    );
  }

  if (!card || cardStatus === 'loading') {
    return (
      <Screen header={nav}>
        <View style={styles.grid}>
          <View style={styles.row}>
            <Skeleton style={styles.tileSkeleton} />
            <Skeleton style={styles.tileSkeleton} />
          </View>
        </View>
      </Screen>
    );
  }

  if (design.phase === 'candidates') {
    return <CandidatesPane card={card} design={design} nav={nav} />;
  }

  if (design.phase === 'editor') {
    return <EditorPane card={card} design={design} nav={nav} />;
  }

  return <CandidatesPane card={card} design={design} nav={nav} />;
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
  /**
   * **무엇을 만들지는 묻지 않는다.**
   *
   * 여덟 종류를 늘어놓고 고르게 하던 자리였는데, 고르는 사람에게 그 목록은 선택지가 아니라
   * 숙제였다 — 무엇을 고르든 그 다음에 할 일(분위기·색감을 고르고 만들기를 누르는 것)이
   * 똑같고, 정작 카드에서 눈에 들어오는 것은 얼굴을 통째로 채우는 그림 한 겹이다. 그래서
   * 이 화면은 그 한 겹만 만든다.
   *
   * 첫 항목을 쓰는 이유는 `BACKGROUND` 를 박아둘 수 없기 때문이다 — 상품 사진이 없는
   * 카드에서는 서버가 409 로 거절하므로, 그런 카드에서는 목록의 다음 것이 온다.
   */
  const type: AiResourceType = design.generatableTypes[0] ?? 'DECORATION';
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  /* 어느 칸이 「직접 입력」으로 열려 있는지. 값만으로는 알 수 없다 — 직접 입력을 고르고 아직
     아무것도 적지 않은 상태와, 애초에 고르지 않은 상태가 둘 다 빈 문자열이기 때문이다. */
  const [customFields, setCustomFields] = useState<Record<string, boolean>>({});
  const group = design.groups[type];
  const optionFields = AI_OPTION_FIELDS[type];
  const generationOptions = useMemo(
    () => ({
      candidateCount: CANDIDATE_COUNT,
      options: Object.fromEntries(
        optionFields
          .map(({ key }) => [key, optionValues[`${type}:${key}`] ?? ''] as const)
          .filter(([, value]) => value.trim().length > 0),
      ),
    }),
    [optionFields, optionValues, type],
  );
  const generateCurrent = () => design.generate(type, generationOptions);

  return (
    <Screen scroll gutter={false} header={nav} contentContainerStyle={styles.content}>
      {optionFields.map((field) => {
        const valueKey = `${type}:${field.key}`;
        const value = optionValues[valueKey] ?? '';
        const custom = customFields[valueKey] ?? false;

        return (
          <View key={field.key} style={styles.field}>
            <Text variant="label" tone="muted" style={styles.fieldLabel}>
              {field.label}
            </Text>

            <ChipGroup
              accessibilityLabel={`${field.label} 고르기`}
              items={field.choices.map((choice) => ({ key: choice, label: choice }))}
              selected={custom ? null : value || null}
              onSelect={(key) => {
                setCustomFields((prev) => ({ ...prev, [valueKey]: false }));
                /* 고른 것을 다시 누르면 고르지 않은 상태로 — 이 칸들은 전부 선택 사항이다. */
                setOptionValues((prev) => ({
                  ...prev,
                  [valueKey]: prev[valueKey] === key ? '' : key,
                }));
              }}
              custom={{
                label: '직접 입력',
                value: custom ? value : '',
                active: custom,
                placeholder: field.placeholder,
                onActivate: () => {
                  setCustomFields((prev) => ({ ...prev, [valueKey]: true }));
                  setOptionValues((prev) => ({ ...prev, [valueKey]: '' }));
                },
                onChangeText: (next) =>
                  setOptionValues((prev) => ({ ...prev, [valueKey]: next })),
              }}
            />
          </View>
        );
      })}

      {group ? (
        <>
          <View style={styles.gridBlock}>
            {/* **고르는 것이 곧 다음 단계다.** 고른 뒤에 「카드에 배치하기」를 한 번 더
                누르게 하던 자리였는데, 그 버튼은 방금 한 선택을 확인만 하고 아무것도 더
                묻지 않았다 — 되돌릴 길(편집기의 「후보 다시 고르기」)이 있으므로 확인을
                받을 이유도 없다. */}
            <CandidateGrid
              candidates={group.candidates}
              candidateCount={Math.max(CANDIDATE_COUNT, group.candidates.length)}
              selectedId={design.selected[type]}
              onSelect={(candidate) => {
                design.select(type, candidate.id);
                design.openEditor();
              }}
            />
          </View>

          {group.slow && !group.expired ? (
            <Text variant="caption" tone="muted" style={styles.note}>
              예상보다 오래 걸리고 있습니다. 계속 만들고 있으니 잠시만 기다려 주세요.
            </Text>
          ) : null}

          {/* 만드는 중에는 다시 만들 수 없다 — 누를 수 없는 버튼을 두는 대신 버튼을 두지 않는다.
              **빈 목록도 "만드는 중"이다.** `[].every()` 는 참이라, 이 검사만으로는 요청을
              보내고 첫 후보가 도착하기 전까지 다시 만들기가 떠 있었다. */}
          {group.candidates.length > 0 && group.candidates.every((c) => !isPending(c.status)) ? (
            <TextLink label="다시 만들기" onPress={generateCurrent} />
          ) : null}
        </>
      ) : (
        <Button label="카드 그림 만들기" onPress={generateCurrent} style={styles.action} />
      )}
    </Screen>
  );
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
      router.replace({
        pathname: '/card/[id]/ai-result',
        params: {
          id: card.id,
          ...(result.customization?.id && { customizationId: result.customization.id }),
        },
      });
    })();
  };

  return (
    <Screen gutter={false} header={nav}>
      <View style={[styles.editor, { paddingBottom: bottomSpace }]}>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: space[7] },
  intro: { marginTop: space[4] },
  grid: { marginTop: space[5], gap: space[5], ...allowPressOverflow },
  gridBlock: { marginTop: space[5], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[3], ...allowPressOverflow },
  blank: { flex: 1 },
  tileSkeleton: { flex: 1, aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  field: { marginTop: space[4] },
  fieldLabel: { marginBottom: space[2] },
  customField: { marginTop: space[3] },
  action: { marginTop: space[4] },
  note: { marginTop: space[3] },


  /* 편집기는 스크롤하지 않는다 — 무대의 드래그와 화면의 스크롤이 같은 손짓을 두 가지 뜻으로
     쓰게 되고, 레이어를 아래로 끌면 화면이 같이 내려간다. */
  editor: { flex: 1, paddingHorizontal: space[4] },
  stage: { width: '100%', maxWidth: PREVIEW_WIDTH, alignSelf: 'center', marginTop: space[4] },
  inspector: { marginTop: space[4] },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
  },
});
