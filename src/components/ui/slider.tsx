import { useCallback, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 한 값을 손가락으로 정하는 유일한 컨트롤.
 *
 * 투명도와 회전 때문에 생겼다. 둘 다 **정확한 숫자보다 방향이 중요한 값**이라 입력란이
 * 맞지 않는다 — 0.7 을 타이핑하는 사람은 없고, 조금 흐리게 하려는 사람만 있다.
 *
 * 트랙 6pt, `radius.full`, 3단계 위에 9단계 — 게이지 바가 쓰던 기하 그대로다. 그쪽은
 * 리워드가 표(`TicketProgress`)로 옮겨가면서 쓰는 곳이 없어져 지웠고, "채워진 길이"의
 * 생김새는 이제 이 파일에만 남아 있다. 노브는 `solidStrong` — 잡는 것은 채움보다 진해야
 * 손이 간다.
 *
 * **행 전체가 52pt 다.** 트랙이 6pt 인 것과 별개로 손가락이 닿는 높이는 다른 컨트롤과 같아야
 * 하고, 그래서 제스처는 트랙이 아니라 행에 붙어 있다.
 *
 * 트랙과 노브는 `useSharedValue` 로 움직이고 **손을 뗄 때 한 번만** `onCommit` 이 불린다.
 * 매 프레임 상태를 갱신하면 편집기의 다른 것들이 같이 다시 그려진다 — `sheet.tsx` 가 드래그
 * 중에 상태를 건드리지 않는 것과 같은 이유다.
 *
 * 제스처를 `runOnJS` 로 돌리는 것은 여기서만이다. 슬라이더가 옮기는 것은 숫자 하나뿐이라
 * JS 스레드로도 손가락을 따라잡고, 그 대가로 워클릿 안에서 shared value 를 쓰지 않게 되어
 * 새 린트 오류를 만들지 않는다. **레이어 드래그는 반대로 UI 스레드에 남는다** — 거기서는
 * 사각형 넷이 매 프레임 움직이고 JS 로 건너가면 눈에 띄게 밀린다.
 */
export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  onCommit,
  format,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** 손을 뗄 때 한 번. 여기서 상태에 넣는다. */
  onCommit: (value: number) => void;
  /** 오른쪽에 적히는 글자. 없으면 아무것도 적지 않는다. */
  format?: (value: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const [shown, setShown] = useState(value);

  const ratio = useSharedValue(toRatio(value, min, max));
  const start = useSharedValue(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);

  const gesture = Gesture.Pan()
    .onStart(() => {
      start.value = ratio.value;
    })
    .onUpdate((e) => {
      if (width <= 0) return;
      ratio.value = clamp01(start.value + e.translationX / width);
    })
    .onEnd(() => {
      onCommit(min + ratio.value * (max - min));
    })
    .runOnJS(true);

  /* 값이 밖에서 바뀌면(레이어를 갈아타면) 따라간다. 드래그 중에는 그 쪽이 이긴다. */
  if (shown !== value) {
    setShown(value);
    ratio.value = toRatio(value, min, max);
  }

  const fill = useAnimatedStyle(() => ({ width: `${ratio.value * 100}%` }));
  const knob = useAnimatedStyle(() => ({ left: `${ratio.value * 100}%` }));

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        {format ? (
          <Text variant="caption" tone="muted">
            {format(value)}
          </Text>
        ) : null}
      </View>

      <GestureDetector gesture={gesture}>
        {/* 제스처는 트랙이 아니라 이 상자에 붙는다 — 6pt 를 정확히 짚으라고 요구할 수 없다. */}
        <View
          style={styles.hit}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fill]} />
          </View>
          <Animated.View style={[styles.knob, knob]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const KNOB = 20;

const toRatio = (value: number, min: number, max: number) =>
  max === min ? 0 : clamp01((value - min) / (max - min));

function clamp01(n: number) {
  'worklet';
  return Math.min(1, Math.max(0, n));
}

const styles = StyleSheet.create({
  row: { paddingVertical: space[2] },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[2] },
  /** 52 에서 라벨 줄을 뺀 나머지. 손가락이 닿는 높이는 다른 컨트롤과 같다. */
  hit: { height: 28, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.solid },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    marginLeft: -KNOB / 2,
    borderRadius: radius.full,
    backgroundColor: colors.solidStrong,
  },
});
