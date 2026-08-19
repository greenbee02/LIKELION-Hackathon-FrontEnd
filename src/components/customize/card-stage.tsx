import { useCallback, useState } from 'react';
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
 * **`CardFace` 를 쓰지 않는다.** 그 컴포넌트의 계약은 "위쪽 두 줄과 하우스 마크, 그 외
 * 아무것도 없음"이고 파일 전체의 주석이 그 근거다. 레이어를 받는 prop 을 붙이는 순간 같은
 * 이름의 다른 컴포넌트가 되고, 여섯 군데에서 쓰이던 원래 계약이 흐려진다. 비율만 물려받는다.
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
  imageForResource,
  onSelect,
  onCommitFrame,
}: {
  card: Card;
  layers: CardLayer[];
  activeId?: string | null;
  interactive?: boolean;
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
      <View style={[styles.ground, { backgroundColor: card.brand.accent }]} />

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
