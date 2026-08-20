import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { space } from '@/theme/spacing';

/**
 * 점선 한 줄.
 *
 * **`borderStyle: 'dashed'` 로 긋지 않는다.** RN 에서 그 값은 플랫폼마다 다르게 그려진다 —
 * 한쪽 변에만 두께를 준 View 에서는 iOS 가 실선으로 떨어뜨리는 일이 있고, 대시의 길이와
 * 간격을 지정할 방법도 없어서 웹과 네이티브가 서로 다른 점선을 그린다. 카드 위쪽 스크림을
 * 스택된 반투명 띠 대신 SVG 그라디언트로 그린 것과 같은 이유다: **그림을 정확히 지정할 수
 * 있는 곳에서 그린다.**
 *
 * 선을 세로 가운데에 놓기 위해 `y` 는 0 이 아니라 0.5 다. 1픽셀 획은 정수 좌표에 놓이면
 * 위아래 픽셀에 반씩 걸쳐 두 줄로 흐려진다.
 *
 * 두께는 1 로 고정한다. 점선이 굵어지는 순간 그것은 구분선이 아니라 무늬가 되고, 이 선이
 * 하는 일은 "여기부터는 다른 것"이라고 말하는 것뿐이다.
 */
export function DashedRule({ color, style }: { color: string; style?: object }) {
  return (
    <View style={[styles.rule, style]}>
      <Svg width="100%" height={1}>
        <Line
          x1="0"
          y1="0.5"
          x2="100%"
          y2="0.5"
          stroke={color}
          strokeWidth={1}
          /* 대시와 간격이 같은 길이 — 점선이 방향을 갖지 않아야 선으로만 읽힌다. */
          strokeDasharray={`${space[1]} ${space[1]}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * **폭을 지정하지 않는다 — `alignSelf: 'stretch'` 가 그 일을 한다.**
   *
   * `width: '100%'` 는 부모의 *콘텐츠* 폭에 고정되므로, 호출한 쪽이 음수 여백으로 패딩 밖까지
   * 선을 빼내도 폭은 따라 늘지 않는다. 선이 왼쪽으로만 밀려나고 오른쪽은 패딩 두 겹만큼
   * 모자란 채로 끝난다. `stretch` 는 여백을 뺀 나머지를 채우므로 음수 여백이면 그만큼 넓어진다.
   */
  rule: { height: 1, alignSelf: 'stretch' },
});
