import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { allowPressOverflow } from '@/components/ui/press-scale';
import { useProtectedUrl } from '@/lib/card-art';
import { clampFrame, isFullBleed, MIN_SIDE, type Size } from '@/lib/card-layers';
import type { CardLayer, Frame } from '@/lib/types';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * 카드 위의 레이어 하나 — 그림, 그리고 그것을 옮기는 손.
 *
 * **레이어마다 자기 `useSharedValue` 를 갖는다.** 훅을 반복문 안에서 부를 수 없으므로(그리고
 * `reactCompiler` 가 그 규칙을 엄격히 본다) 레이어 하나가 컴포넌트 하나여야 한다. 그 제약이
 * 오히려 맞는 구조를 강제한다 — 드래그하는 사각형의 좌표가 그 사각형 옆에 있게 된다.
 *
 * **드래그 중에는 React 를 깨우지 않는다.** 좌표는 UI 스레드의 shared value 에만 있고, 손을
 * 뗄 때 `runOnJS` 로 한 번 올라간다. 매 프레임 상태를 갱신하면 형제 레이어와 인스펙터와
 * 목록이 같이 다시 그려지고, 손가락을 따라가지 못한다. `sheet.tsx` 가 드래그 중 상태를
 * 건드리지 않는 것과 같은 구조를 레이어 수만큼 복제한 것이다.
 *
 * **좌표는 매 프레임 0~1 로 접힌다.** 그래서 레이어는 카드 밖으로 나갈 수 없고, 그 결과
 * 무대가 `overflow:'hidden'` 일 필요가 없다 — 선택 핸들이 잘리지 않는 이유가 그것이다.
 * 대신 카드를 꽉 채우는 레이어는 자기 모서리를 스스로 둥글린다.
 */
export function LayerView({
  layer,
  size,
  active,
  interactive,
  productImageUrl,
  resourceImageUrl,
  onSelect,
  onCommit,
}: {
  layer: CardLayer;
  size: Size;
  active: boolean;
  interactive: boolean;
  /** `PRODUCT` 레이어가 AI 컷 없이 쓸 기본 상품 사진. */
  productImageUrl?: string | null;
  /** 이 레이어에 붙은 AI 리소스의 그림. 없으면 종류에 따라 상품 사진이나 빈 칸. */
  resourceImageUrl?: string | null;
  onSelect: () => void;
  onCommit: (frame: Frame) => void;
}) {
  const frame = useSharedValue<Frame>(layer.frame);
  const start = useSharedValue<Frame>(layer.frame);

  /* 밖에서 좌표가 바뀌면(배치 적용, 되돌리기) 따라간다. 렌더 중 대입이라 다음 프레임에
     반영되고, 드래그 중에는 이 값과 shared value 가 같으므로 아무 일도 일어나지 않는다. */
  if (
    frame.value.x !== layer.frame.x ||
    frame.value.y !== layer.frame.y ||
    frame.value.width !== layer.frame.width ||
    frame.value.height !== layer.frame.height
  ) {
    frame.value = layer.frame;
  }

  const movable = interactive && !layer.locked;

  const drag = Gesture.Pan()
    .enabled(movable)
    .onStart(() => {
      start.value = frame.value;
    })
    .onUpdate((e) => {
      if (size.width <= 0 || size.height <= 0) return;
      frame.value = clampFrame({
        ...start.value,
        x: start.value.x + e.translationX / size.width,
        y: start.value.y + e.translationY / size.height,
      });
    })
    .onEnd(() => {
      runOnJS(onCommit)(frame.value);
    });

  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  /* 팬이 우선이다 — 손가락이 움직이지 않았을 때만 탭이 된다. `sheet.tsx` 가 쓰는 조합 그대로. */
  const gesture = Gesture.Exclusive(drag, tap);

  /**
   * 모서리 넷의 제스처를 **여기서** 만든다.
   *
   * 핸들을 별도 컴포넌트로 떼고 shared value 를 prop 으로 넘기면 React Compiler 가 막는다 —
   * 훅이 만든 값을 남의 컴포넌트가 고치는 모양이 되기 때문이고, 그건 맞는 지적이다. 제스처는
   * 훅이 아니라 그냥 객체라서 이 자리에서 넷을 만들 수 있고, 그러면 좌표를 만든 곳과 고치는
   * 곳이 같아진다.
   */
  const corners = CORNERS.map((corner) => ({
    ...corner,
    gesture: Gesture.Pan()
      .onStart(() => {
        start.value = frame.value;
      })
      .onUpdate((e) => {
        if (size.width <= 0 || size.height <= 0) return;

        /* 레이어가 기울어져 있으면 화면에서의 이동을 레이어의 축으로 되돌려 읽어야 한다.
           그러지 않으면 45도 기운 레이어에서 오른쪽으로 끌었는데 아래로 커진다. */
        const rad = (-layer.rotation * Math.PI) / 180;
        const dx = e.translationX * Math.cos(rad) - e.translationY * Math.sin(rad);
        const dy = e.translationX * Math.sin(rad) + e.translationY * Math.cos(rad);

        const width = Math.max(MIN_SIDE, start.value.width + (corner.dx * dx) / size.width);
        const height = Math.max(MIN_SIDE, start.value.height + (corner.dy * dy) / size.height);

        frame.value = clampFrame({
          /* 잡지 않은 모서리가 제자리에 있어야 한다: 왼쪽을 끌면 오른쪽 끝이 고정이므로
             원점이 폭의 변화만큼 움직인다. */
          x: corner.dx < 0 ? start.value.x + (start.value.width - width) : start.value.x,
          y: corner.dy < 0 ? start.value.y + (start.value.height - height) : start.value.y,
          width,
          height,
        });
      })
      .onEnd(() => {
        runOnJS(onCommit)(frame.value);
      }),
  }));

  const box = useAnimatedStyle(() => ({
    left: frame.value.x * size.width,
    top: frame.value.y * size.height,
    width: frame.value.width * size.width,
    height: frame.value.height * size.height,
    opacity: layer.visible ? layer.opacity : 0,
    transform: [{ rotate: `${layer.rotation}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.layer, isFullBleed(layer.type) && styles.rounded, box]}>
        <LayerBody
          layer={layer}
          productImageUrl={productImageUrl}
          resourceImageUrl={resourceImageUrl}
        />

        {/* 핸들은 레이어의 자식이라 회전을 같이 받는다 — 기울어진 레이어의 모서리에 그대로
            붙어 있다. 레이어 밖으로 반쯤 나가므로 이 뷰는 잘라내지 않는다. */}
        {active && interactive && !layer.locked
          ? corners.map((corner) => (
              <GestureDetector key={corner.key} gesture={corner.gesture}>
                {/* 바깥 24pt 는 손가락이 닿는 상자라 투명하고, 안쪽 12pt 만 보인다. 점 자체를
                    24 로 키우면 작은 레이어가 핸들에 덮이고, 12 로 줄이면 짚을 수 없다. */}
                <View style={[styles.handle, corner.style]}>
                  <View style={styles.dot} />
                </View>
              </GestureDetector>
            ))
          : null}
      </Animated.View>
    </GestureDetector>
  );
}

/** 레이어의 속. 그림이 없으면 아무것도 그리지 않는다 — 자리 표시자는 카드에 남는다. */
function LayerBody({
  layer,
  productImageUrl,
  resourceImageUrl,
}: {
  layer: CardLayer;
  productImageUrl?: string | null;
  resourceImageUrl?: string | null;
}) {
  const url = resourceImageUrl ?? (layer.type === 'PRODUCT' ? productImageUrl : null);
  const source = useProtectedUrl(url);

  if (layer.type === 'TEXT') {
    const style = layer.style ?? {};
    return (
      <Text
        variant="engraving"
        numberOfLines={2}
        style={[
          styles.text,
          typeof style.color === 'string' && { color: style.color },
          typeof style.letterSpacing === 'number' && { letterSpacing: style.letterSpacing },
          typeof style.fontWeight === 'string' && { fontWeight: style.fontWeight as never },
          typeof style.textAlign === 'string' && { textAlign: style.textAlign as never },
        ]}
      >
        {layer.text ?? ''}
      </Text>
    );
  }

  if (!source) return null;

  return (
    <Image
      source={source}
      style={StyleSheet.absoluteFill}
      contentFit={isFullBleed(layer.type) ? 'cover' : 'contain'}
      transition={200}
    />
  );
}

/**
 * 모서리 넷.
 *
 * **핀치와 회전 제스처가 아니라 핸들인 것이 계약이다.** 웹은 마우스 하나뿐이라 두 손가락
 * 제스처가 존재하지 않는데, RN Web 에서도 모든 화면이 쓸 수 있어야 한다는 것이 이 앱의
 * 규칙이다. 핸들은 양쪽에서 똑같이 동작한다 — 터치에서 핀치가 추가로 되면 좋은 것이지,
 * 핀치가 없으면 크기를 못 바꾸는 상태가 되어서는 안 된다.
 *
 * **회전 핸들은 없다.** 회전은 인스펙터의 슬라이더가 맡는다 — 손으로 돌리는 것보다 정확하고,
 * 무엇보다 작은 레이어에 핸들을 다섯 개 붙이면 레이어보다 핸들이 커진다.
 */
const CORNERS = [
  { key: 'tl', dx: -1, dy: -1, style: { left: -12, top: -12 } },
  { key: 'tr', dx: 1, dy: -1, style: { right: -12, top: -12 } },
  { key: 'bl', dx: -1, dy: 1, style: { left: -12, bottom: -12 } },
  { key: 'br', dx: 1, dy: 1, style: { right: -12, bottom: -12 } },
] as const;

const HANDLE = 24;
const DOT = 12;

const styles = StyleSheet.create({
  layer: { position: 'absolute', ...allowPressOverflow },
  rounded: { borderRadius: radius.base, overflow: 'hidden' },
  text: { width: '100%' },

  /* 손가락이 닿는 상자는 24, 보이는 점은 12. 12pt 를 정확히 짚으라고 요구할 수 없다. */
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 배경 1단계에 8단계 테두리 — 사진 위에서도 카드 위에서도 보인다. */
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
});
