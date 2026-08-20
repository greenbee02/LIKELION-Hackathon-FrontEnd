import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type TextStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { imageSource } from '@/lib/card-art';
import { resolveCardFontFamily } from '@/lib/font-fallback';
import type { CardFaceLayer, Frame } from '@/lib/types';
import { colors } from '@/theme/colors';
import { faceInk } from '@/theme/typography';

/**
 * 승인 에셋 세 겹을 겹쳐 카드 앞면을 만든다.
 *
 * **여기가 서버가 하지 않는 일을 대신하는 자리다.** AI 경로는 서버가 한 장으로 구워 주소를
 * 돌려주지만, 승인 에셋 경로는 아무것도 굽지 않고 "무엇을 어디에 놓았는가"만 남긴다. 그래서
 * 앞면의 합성은 매 렌더 화면에서 일어난다 — 그림이 아니라 배치가 저장된 카드다.
 *
 * **픽셀이 없다.** 좌표가 0~1 이므로 위치와 크기를 백분율로 그대로 옮기면 되고, 그 덕분에
 * 이 컴포넌트는 자기가 얼마나 큰지 알 필요가 없다. 그리드 타일이든 상세 히어로든 같은 배치가
 * 같은 비율로 나온다. 딱 하나 예외가 문구인데, 글자 크기만은 백분율로 말할 수 없어서 높이를
 * 한 번 잰다.
 *
 * 제스처도 상태도 없다. 움직이는 것은 편집기의 `LayerView` 쪽 일이고, 여기는 굳은 것을
 * 그리기만 한다 — 그래서 카드가 목록에 스무 장 깔려도 값이 싸다.
 */
export function CardLayerStack({ layers }: { layers: CardFaceLayer[] }) {
  /* 문구 하나 때문에 재는 값이다. 문구가 없으면 이 상태는 0 인 채로 쓰이지 않는다. */
  const [height, setHeight] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    setHeight((prev) => (prev === next ? prev : next));
  }, []);

  return (
    <View style={styles.stack} onLayout={onLayout} pointerEvents="none">
      {layers.map((layer, index) => (
        <LayerBody
          /* 한 종류는 한 겹뿐이라(DB UNIQUE) 종류가 곧 키다. 낯선 종류가 섞여 들어와도
             부딪히지 않게 순서를 함께 붙인다. */
          key={`${layer.type}-${index}`}
          layer={layer}
          faceHeight={height}
        />
      ))}
    </View>
  );
}

function LayerBody({ layer, faceHeight }: { layer: CardFaceLayer; faceHeight: number }) {
  const box = [
    styles.layer,
    {
      left: pct(layer.frame.x),
      top: pct(layer.frame.y),
      width: pct(layer.frame.width),
      height: pct(layer.frame.height),
      opacity: layer.opacity,
      transform: [{ rotate: `${layer.rotation}deg` }],
    },
  ];

  if (layer.type === 'TEXT') {
    const ink = faceTextStyle(layer.frame.height, faceHeight, layer.style);
    if (!layer.text || !ink) return null;
    return (
      <View style={box}>
        <Text variant="body" tone="inverted" style={ink} numberOfLines={1}>
          {layer.text}
        </Text>
      </View>
    );
  }

  const source = imageSource(layer.imageUrl);
  if (!source) return null;
  return (
    <View style={box}>
      <Image
        source={source}
        style={styles.fill}
        /* 얼굴을 꽉 채우는 겹은 잘라서라도 채우고, 그렇지 않은 겹은 제 비율을 지킨다.
           테두리는 알파 PNG 라 배경을 가리지 않는다. */
        contentFit={coversFace(layer.frame) ? 'cover' : 'contain'}
        transition={200}
      />
    </View>
  );
}

/**
 * 카드 위에 새겨진 문구가 쓰는 스타일 — **얼굴과 편집기가 같은 것을 부른다.**
 *
 * 크기가 여기서 정해진다. **상자의 높이가 곧 글자 크기다**: 편집기에서 상자를 키우면 글씨가
 * 커지고, 같은 카드가 그리드 타일로 작아지면 글씨도 같은 비율로 작아진다 — 한 숫자가 두 가지를
 * 한꺼번에 정하므로 둘이 어긋날 방법이 없다.
 *
 * **역할 대신 raw `fontSize` 를 쓰는 유일한 자리다.** 이 크기는 우리가 고른 값이 아니라 카드에
 * 저장된 데이터이고, 그래서 타입 스케일이 답할 수 있는 질문이 아니다. `brand.accent` 가 토큰
 * 밖의 색인 것과 같은 논거다 — 얼굴·굵기·자간은 `faceInk` 에서 오고, 크기만 카드에서 온다.
 *
 * 잴 수 없거나(높이 0) 너무 작아 읽을 수 없으면 `null` 이다. 부르는 쪽은 그리지 않는다.
 */
export function faceTextStyle(
  frameHeight: number,
  faceHeight: number,
  style?: Record<string, unknown>,
): TextStyle | null {
  const fontSize = Math.round(frameHeight * faceHeight);
  if (fontSize < 1) return null;
  return {
    ...faceStyles.ink,
    fontSize,
    lineHeight: Math.round(fontSize * 1.1),
    ...(typeof style?.fontFamily === 'string' && {
      fontFamily: resolveCardFontFamily(style.fontFamily),
    }),
    ...(typeof style?.color === 'string' && { color: style.color }),
    ...(typeof style?.fontWeight === 'string' && { fontWeight: style.fontWeight as never }),
    ...(typeof style?.textAlign === 'string' && { textAlign: style.textAlign as never }),
    ...(typeof style?.letterSpacing === 'number' && { letterSpacing: style.letterSpacing }),
  };
}

/** 0~1 을 백분율 문자열로. 이 컴포넌트가 픽셀을 몰라도 되는 이유가 이 한 줄이다. */
const pct = (value: number): DimensionValue => `${value * 100}%`;

const coversFace = (frame: Frame) =>
  frame.x === 0 && frame.y === 0 && frame.width === 1 && frame.height === 1;

const styles = StyleSheet.create({
  stack: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  layer: { position: 'absolute', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
});

/* `faceTextStyle()` 이 크기를 얹어 돌려줄 바탕. `StyleSheet.create` 를 거치면 숫자 id 가 되어
   펼칠 수 없으므로 평범한 객체로 둔다. */
const faceStyles = {
  /* 도시가 밝은 하늘 위에서 쓰는 것과 같은 그림자. 생성된 그림 위에 흰 글씨를 얹는 문제가
     같으므로 답도 같아야 한다. */
  ink: {
    ...faceInk,
    color: colors.textInverted,
    textShadowColor: colors.scrimInk,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  } satisfies TextStyle,
};
