import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { LayerView } from './layer-view';
import { CARD_ASPECT } from '@/components/card/card-face';
import { allowPressOverflow } from '@/components/ui/press-scale';
import type { Size } from '@/lib/card-layers';
import type { Card, CardLayer, Frame } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * 레이어가 놓이는 카드 크기의 무대.
 *
 * **`CardFace` 를 스스로 부르지는 않는다 — 바닥으로 받는다.** 한때 여기에는 "`CardFace` 에
 * 레이어 prop 을 붙이지 말라"고 적혀 있었고, AI 경로만 있던 동안은 맞는 말이었다. 승인 에셋
 * 경로가 생기면서 **레이어가 곧 카드의 얼굴이 되었고**, 얼굴을 그리는 컴포넌트가 레이어를
 * 모르면 여섯 화면 전부가 빈 카드를 그린다. 그래서 `CardFace` 는 레이어를 알게 되었다.
 *
 * 그렇다고 이 무대가 `CardFace` 를 부를 이유는 없다. **`ground` 로 받으면 무대는 여전히
 * 얼굴을 모른다** — 바닥에 무엇이 깔리든 그 위에 움직이는 레이어를 얹는 일만 한다. 승인 에셋
 * 편집기는 굳은 두 겹을 담은 `CardFace` 를 바닥으로 넘기고 움직이는 문구 하나만 여기 맡기며,
 * 그래서 편집 중에 보는 것과 저장 후에 보는 것이 같은 컴포넌트에서 나온다.
 *
 * **잘라내지 않는다(`overflow: 'hidden'` 이 없다).** 좌표가 매 프레임 0~1 로 접히므로 레이어는
 * 카드 밖으로 나갈 수 없고, 잘라낼 것이 애초에 없다. 대신 잘라내지 않기 때문에 **선택 핸들이
 * 모서리에서 반쪽만 보이는 일이 없다** — 클립 컨테이너 안에 핸들을 두면 x=0 에 있는 레이어의
 * 왼쪽 핸들은 언제나 절반이 사라진다.
 *
 * `interactive={false}` 로 두면 같은 컴포넌트가 결과 미리보기가 된다. 미리보기를 따로 만들면
 * 편집 중에 보던 것과 저장 후에 보는 것이 서로 어긋나기 시작한다.
 */
export function CardStage({
  card,
  layers,
  activeId,
  interactive = false,
  ground,
  imageForResource,
  onSelect,
  onCommitFrame,
}: {
  card: Card;
  layers: CardLayer[];
  activeId?: string | null;
  interactive?: boolean;
  /** 레이어 밑에 깔 것. 넘기지 않으면 브랜드의 색이 깔린다. */
  ground?: ReactNode;
  /** 레이어에 붙은 AI 리소스의 그림 주소를 찾아준다. 없으면 `null`. */
  imageForResource: (resourceId: string) => string | null;
  onSelect?: (id: string | null) => void;
  onCommitFrame?: (id: string, frame: Frame) => void;
}) {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  return (
    <View style={styles.stage} onLayout={onLayout}>
      {/* 바닥. 아무 레이어도 없거나 그림이 아직 안 왔을 때 보이는 것은 브랜드의 색이고,
          그건 로딩 상태가 아니라 `CardFace` 가 원래 갖고 있던 완성된 모습이다. */}
      {ground ? (
        <View style={styles.ground}>{ground}</View>
      ) : (
        <View style={[styles.ground, { backgroundColor: card.brand.accent }]} />
      )}

      {/* 빈 곳을 누르면 선택이 풀린다. 레이어 밑에 깔려 있으므로 레이어를 가리지 않는다. */}
      {interactive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="선택 해제"
          onPress={() => onSelect?.(null)}
          style={styles.ground}
        />
      ) : null}

      {size.width > 0
        ? layers.map((layer) => (
            <LayerView
              key={layer.id}
              layer={layer}
              size={size}
              active={layer.id === activeId}
              interactive={interactive}
              productImageUrl={card.product.imageUrl}
              resourceImageUrl={layer.resourceId ? imageForResource(layer.resourceId) : null}
              onSelect={() => onSelect?.(layer.id)}
              onCommit={(frame) => onCommitFrame?.(layer.id, frame)}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    ...allowPressOverflow,
  },
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.base,
  },
});
