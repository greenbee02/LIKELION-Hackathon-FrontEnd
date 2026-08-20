import { useLocalSearchParams, useRouter } from 'expo-router';
import { Layers, Palette, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARD_ASPECT, CardFace } from '@/components/card/card-face';
import { CardBack } from '@/components/card/card-back';
import { AssetGrid } from '@/components/customize/asset-grid';
import { CardStage } from '@/components/customize/card-stage';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { NavBar } from '@/components/ui/nav-bar';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextLink } from '@/components/ui/text-link';
import { useToast } from '@/components/ui/toast';
import {
  fetchCustomizationOptions,
  type CustomizationOptions,
  type DesignAsset,
} from '@/lib/api/card-design-assets';
import { createLayeredCustomization, restoreOriginalCard } from '@/lib/api/customizations';
import { failureMessage } from '@/lib/api/errors';
import { useCard, useCards } from '@/lib/cards-store';
import { makeLayer } from '@/lib/card-layers';
import type { Card, CardFaceLayer, CardLayer, Frame } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/** 미리보기 카드의 폭. 편집기와 같다 — 여기서도 카드는 주인공이 아니라 작업 대상이다. */
const PREVIEW_WIDTH = 220;

/** 배경과 테두리는 서버가 전면으로 굳혀 저장한다. 우리도 같은 값으로 미리 그린다. */
const FULL: Frame = { x: 0, y: 0, width: 1, height: 1 };

/**
 * 문구가 처음 놓이는 자리 — 아래쪽 3분의 1.
 *
 * `DEFAULT_FRAMES.TEXT` 를 쓰지 않는 이유가 있다. 그쪽은 카드 위쪽 8% 인데, 이 얼굴의 위쪽
 * 밴드에는 이미 도시와 날짜와 하우스의 마크가 있다. 태어나자마자 다른 글자와 겹치는 자리는
 * "가장 덜 틀린 자리"가 아니다.
 */
const SEED_TEXT_FRAME: Frame = { x: 0.1, y: 0.74, width: 0.6, height: 0.06 };

/** 계약이 정한 문구 레이어의 쌓임 순서. 배경 10, 테두리 20 위에 온다. */
const TEXT_Z_INDEX = 30;

/**
 * 서버로 보내는 문구 스타일 — **뜻을 보내지, hex 를 보내지 않는다.**
 *
 * 백엔드는 이 객체를 검증 없이 저장하고 그대로 돌려준다. 즉 **프론트가 정하면 그것이 계약이
 * 된다.** 그래서 값으로 `#E8DFD2` 같은 것을 넣지 않는다 — 나중에 서버가 이 카드를 이미지로
 * 굽게 되면 같은 키를 서버도 해석해야 하는데, 그때 필요한 것은 우리 팔레트의 한 지점이지
 * 어느 날의 색상값이 아니다. `backend-open-items.md` §4.
 */
const FACE_TEXT_STYLE = {
  fontFamily: 'PLATFORM_SANS',
  color: 'INVERTED',
  align: 'LEFT',
} as const;

type Step = 'fork' | 'pick' | 'text';
type EditSide = 'front' | 'back';

/**
 * 카드 꾸미기 — 하우스가 승인해 둔 그림으로.
 *
 * **AI 편집기(`edit.tsx`)와 형제이고, 성질이 정반대다.** 저쪽은 모델을 태우므로 기다림과
 * 폴링과 "느려지고 있습니다"가 화면의 절반을 차지한다. 이쪽에는 그것이 하나도 없다 — 고를
 * 것은 이미 서버에 있고, 저장은 201 한 번으로 끝나며, 그래서 상태 머신도 훅도 없이 화면
 * 로컬 `useState` 로 충분하다. **기다림이 없는 흐름에 기다림의 구조를 흉내 내지 않는다.**
 *
 * 한 라우트, 세 얼굴. 갈래 → 고르기 → 문구. `edit.tsx` 가 같은 이유로 같은 모양이다:
 * 단계마다 라우트를 두면 뒤로 가기가 취소인지 되돌리기인지 알 수 없어진다.
 */
export default function DesignCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, status: cardStatus } = useCard(id);
  const router = useRouter();
  const toast = useToast();
  const { loadCard } = useCards();

  const [step, setStep] = useState<Step>('fork');
  const [options, setOptions] = useState<CustomizationOptions | null>(null);
  const [loadFailed, setLoadFailed] = useState<string | null>(null);
  const [background, setBackground] = useState<DesignAsset | null>(null);
  const [border, setBorder] = useState<DesignAsset | null>(null);
  const [text, setText] = useState<CardLayer>(() =>
    makeLayer('TEXT', { text: '', frame: SEED_TEXT_FRAME }),
  );
  const [editSide, setEditSide] = useState<EditSide>('front');
  const [saving, setSaving] = useState(false);

  /**
   * 옵션은 **갈래에서 기본을 고른 뒤에** 부른다.
   *
   * 갈래 화면에서 미리 불러두면 AI 로 가는 고객의 몫까지 요청이 나가고, 실패가 고를 화면이
   * 아니라 갈래 화면을 덮어버린다. 고를 화면에 들어온 사람에게만 필요한 데이터다.
   */
  useEffect(() => {
    if (step !== 'pick' || options || loadFailed) return;
    let alive = true;
    void (async () => {
      try {
        const next = await fetchCustomizationOptions(id);
        if (!alive) return;
        setOptions(next);
        /* 처음부터 한 벌이 골라져 있다. 빈 미리보기를 보여준 뒤 "고르세요"라고 말하는 것보다,
           이미 성립하는 카드를 보여주고 바꾸게 하는 편이 고를 것이 무엇인지도 잘 설명한다. */
        setBackground(next.backgrounds[0] ?? null);
        setBorder(next.borders[0] ?? null);
      } catch (e) {
        if (alive) setLoadFailed(failureMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [step, options, loadFailed, id]);

  /** 지금까지 고른 것으로 그린 얼굴. 저장되면 서버가 돌려줄 것과 같은 모양이다. */
  const face = useMemo<CardFaceLayer[]>(() => {
    const layers: CardFaceLayer[] = [];
    if (background) layers.push(assetLayer(background, 'PRODUCT_BACKGROUND', 10));
    if (border) layers.push(assetLayer(border, 'BORDER', 20));
    return layers;
  }, [background, border]);

  const content = (text.text ?? '').trim();
  const canSave = Boolean(background && border && options?.backLayoutId && content);

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

  if (!card || cardStatus === 'loading') {
    return (
      <Screen contentContainerStyle={styles.head}>
        {nav}
        <View style={styles.stage}>
          <Skeleton style={styles.faceSkeleton} />
        </View>
      </Screen>
    );
  }

  const undo = () => {
    void (async () => {
      try {
        await restoreOriginalCard(card.id);
        await loadCard(card.id);
        toast('원래 디자인으로 되돌렸습니다.');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      } catch {
        toast('되돌리지 못했습니다.');
      }
    })();
  };

  const save = () => {
    const backLayoutId = options?.backLayoutId;
    if (!background || !border || !backLayoutId) return;
    setSaving(true);
    void (async () => {
      try {
        await createLayeredCustomization(card.id, {
          productBackgroundAssetId: background.id,
          borderAssetId: border.id,
          backLayoutId,
          text: {
            content,
            x: text.frame.x,
            y: text.frame.y,
            width: text.frame.width,
            height: text.frame.height,
            rotation: text.rotation,
            opacity: text.opacity,
            zIndex: TEXT_Z_INDEX,
            style: FACE_TEXT_STYLE,
          },
        });
        /* 저장이 곧 선택이다 — 이 경로에는 `select` 왕복이 없다. 카드만 다시 불러오면
           컬렉션과 상세가 함께 새 얼굴을 갖는다. */
        await loadCard(card.id);
        toast('카드에 반영되었습니다');
        router.replace({ pathname: '/card/[id]', params: { id: card.id } });
      } catch (e) {
        /* 서버의 한국어 문장을 그대로 쓴다. 어느 에셋이 왜 거절됐는지는 서버가 더 정확하다. */
        toast(failureMessage(e));
        setSaving(false);
      }
    })();
  };

  if (step === 'fork') {
    return (
      <ForkPane
        card={card}
        nav={nav}
        onStatic={() => setStep('pick')}
        onAi={() => router.replace({ pathname: '/card/[id]/edit', params: { id: card.id } })}
        onUndo={undo}
      />
    );
  }

  if (step === 'pick') {
    return (
      <Screen scroll gutter={false} contentContainerStyle={styles.content}>
        {nav}

        {loadFailed ? (
          <EmptyState
            icon={Palette}
            title="디자인을 불러오지 못했습니다"
            note={loadFailed}
            action={{ label: '다시 시도', onPress: () => setLoadFailed(null) }}
          />
        ) : !options ? (
          <View style={styles.grid}>
            <View style={styles.row}>
              <Skeleton style={styles.tileSkeleton} />
              <Skeleton style={styles.tileSkeleton} />
              <Skeleton style={styles.tileSkeleton} />
            </View>
          </View>
        ) : options.backgrounds.length === 0 || options.borders.length === 0 ? (
          <EmptyState
            icon={Palette}
            title="이 상품에는 아직 승인된 디자인이 없습니다"
            note={`${card.brand.name} 가 이 상품의 카드 디자인을 준비하면\n여기에서 고르실 수 있습니다.`}
          />
        ) : (
          <>
            <Text variant="body" tone="muted" style={styles.intro}>
              {`${card.brand.name} 가 승인한 배경과 테두리 중에서 고르시면,\n그 위에 새길 한 줄을 직접 놓으실 수 있습니다.`}
            </Text>

            <Text variant="heading" style={styles.section}>
              배경
            </Text>
            <AssetGrid assets={options.backgrounds} selectedId={background?.id} onSelect={setBackground} />

            <Text variant="heading" style={styles.section}>
              테두리
            </Text>
            <AssetGrid
              assets={options.borders}
              selectedId={border?.id}
              onSelect={setBorder}
              underlayUrl={background?.imageUrl}
            />

            <Button
              label="다음"
              disabled={!background || !border}
              onPress={() => setStep('text')}
              style={styles.action}
            />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen gutter={false}>
      <View style={styles.editor}>
        {nav}

        <View style={styles.sideToggle} accessibilityRole="tablist">
          {(['front', 'back'] as const).map((side) => (
            <Pressable
              key={side}
              accessibilityRole="tab"
              accessibilityState={{ selected: editSide === side }}
              onPress={() => setEditSide(side)}
              style={[styles.sideButton, editSide === side && styles.sideButtonActive]}
            >
              <Text
                variant="label"
                style={[styles.sideLabel, editSide === side && styles.sideLabelActive]}
              >
                {side === 'front' ? '앞면' : '뒷면'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.stage}>
          {editSide === 'front' ? (
            /* 굳은 두 겹은 바닥에 깔고, 움직이는 문구 하나만 무대에 맡긴다 — 바닥이 `CardFace`
               이므로 편집 중에 보는 것이 저장 후에 보는 것과 같은 컴포넌트에서 나온다. */
            <CardStage
              card={card}
              layers={[text]}
              activeId={text.id}
              interactive
              ground={<CardFace card={card} layers={face} />}
              imageForResource={() => null}
              onSelect={() => undefined}
              onCommitFrame={(_, frame) => setText((prev) => ({ ...prev, frame }))}
            />
          ) : (
            <CardBack card={card} />
          )}
        </View>

        {editSide === 'front' ? (
          <>
            <Input
              label="카드에 새길 한 줄"
              value={text.text ?? ''}
              onChangeText={(next) => setText((prev) => ({ ...prev, text: next }))}
              placeholder="예: 2026 SEOUL"
              maxLength={60}
              style={styles.field}
            />

            <Text variant="caption" tone="muted" style={styles.note}>
              {content
                ? '문구를 끌어 옮기고, 모서리를 잡아 크기를 바꿀 수 있습니다.'
                : '카드에 새길 한 줄을 적어주세요.'}
            </Text>
          </>
        ) : (
          <Text variant="caption" tone="muted" style={styles.note}>
            카드 뒷면을 확인했습니다. 저장되는 문구는 앞면에 적용됩니다.
          </Text>
        )}

        <Button
          label="이 디자인으로 저장"
          loading={saving}
          disabled={!canSave}
          onPress={save}
          style={styles.action}
        />
        <TextLink label="디자인 다시 고르기" onPress={() => setStep('pick')} />
      </View>
    </Screen>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
 * 갈래 — 승인된 그림으로 갈 것인가, 만들 것인가
 * ────────────────────────────────────────────────────────────────────────────── */

/**
 * 두 갈래를 나란히 세운다.
 *
 * 버튼 둘이 아니라 타일 둘인 이유가 있다. 같은 크기로 외치는 버튼 두 개는 화면이 무엇을 위한
 * 것인지 정하지 못했다는 뜻이지만, **여기서는 정하지 못한 것이 아니라 물어보는 것이다** —
 * 고객이 고를 것이 두 가지이고 둘 다 유효하다.
 */
function ForkPane({
  card,
  nav,
  onStatic,
  onAi,
  onUndo,
}: {
  card: Card;
  nav: React.ReactNode;
  onStatic: () => void;
  onAi: () => void;
  onUndo: () => void;
}) {
  return (
    <Screen scroll gutter={false} contentContainerStyle={styles.content}>
      {nav}

      <Text variant="body" tone="muted" style={styles.intro}>
        {`${card.brand.name} 의 카드를 두 가지 방법으로 꾸미실 수 있습니다.`}
      </Text>

      <View style={styles.forks}>
        <ForkTile
          icon={Layers}
          title="승인된 디자인으로"
          note={`하우스가 준비한 배경과 테두리를 고르고\n한 줄을 새깁니다. 바로 반영됩니다.`}
          onPress={onStatic}
        />
        <ForkTile
          icon={Sparkles}
          title="AI 로 만들기"
          note={`이 카드만을 위한 그림을 새로 만듭니다.\n만드는 데 시간이 걸립니다.`}
          onPress={onAi}
        />
      </View>

      {/* 이미 꾸며둔 카드에만 나온다. 되돌릴 것이 없는데 되돌리기를 두면 그 버튼은 거짓말이다. */}
      {card.customization ? <TextLink label="원래 디자인으로 되돌리기" onPress={onUndo} /> : null}
    </Screen>
  );
}

function ForkTile({
  icon: Icon,
  title,
  note,
  onPress,
}: {
  icon: typeof Layers;
  title: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.fork}>
      <Icon size={20} color={colors.text} strokeWidth={1.5} />
      <View style={styles.forkText}>
        <Text variant="action">{title}</Text>
        <Text variant="caption" tone="muted" style={styles.forkNote}>
          {note}
        </Text>
      </View>
    </Pressable>
  );
}

/** 고른 그림 한 장을 얼굴의 한 겹으로. 좌표는 서버가 굳히는 값과 같아야 미리보기가 정직하다. */
function assetLayer(
  asset: DesignAsset,
  type: 'PRODUCT_BACKGROUND' | 'BORDER',
  zIndex: number,
): CardFaceLayer {
  return {
    type,
    assetId: asset.id,
    imageUrl: asset.imageUrl,
    text: null,
    frame: FULL,
    rotation: 0,
    opacity: 1,
    zIndex,
    style: {},
  };
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[7] },
  head: { paddingTop: space[2] },
  intro: { marginTop: space[4] },
  section: { marginTop: space[5], marginBottom: space[3] },
  grid: { marginTop: space[5], gap: space[3], ...allowPressOverflow },
  row: { flexDirection: 'row', gap: space[2] },
  tileSkeleton: { flex: 1, aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  faceSkeleton: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.base },
  field: { marginTop: space[4] },
  note: { marginTop: space[3] },
  action: { marginTop: space[4] },

  forks: { marginTop: space[5], gap: space[3] },
  /* 패널과 같은 규약 — 칠하지 않고 6단계 실선으로 가른다. 페이지의 밝기를 지킨다. */
  fork: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.base,
  },
  forkText: { flex: 1, gap: space[1] },
  forkNote: { lineHeight: 18 },

  /* 편집기는 스크롤하지 않는다 — 무대의 드래그와 화면의 스크롤이 같은 손짓을 두 가지 뜻으로
     쓰게 되고, 문구를 아래로 끌면 화면이 같이 내려간다. */
  editor: { flex: 1, paddingHorizontal: space[4], paddingTop: space[2] },
  sideToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: space[4],
    padding: 2,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  sideButton: { paddingVertical: space[2], paddingHorizontal: space[4], borderRadius: radius.base },
  sideButtonActive: { backgroundColor: colors.text },
  sideLabel: { color: colors.text },
  sideLabelActive: { color: colors.textInverted },
  stage: { width: '100%', maxWidth: PREVIEW_WIDTH, alignSelf: 'center', marginTop: space[4] },
});
