import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';

/**
 * 넓은 창에서 앱이 서는 폭과 높이.
 *
 * 420 은 요즘 폰의 논리 폭 한가운데다 — iPhone 16 Pro 가 402, Pro Max 가 440. 900 은 그 폭에
 * 대략 폰의 세로비를 준다. 둘 다 이 파일 밖으로 나가지 않는다: 화면이 자기 폭을 알아야 할 때는
 * `useFrameWidth()` 로 묻는다.
 */
const FRAME_WIDTH = 420;
const FRAME_HEIGHT = 900;

/**
 * 데스크톱 창에서 앱이 폰만 한 크기로 서게 하는 틀.
 *
 * 이 앱은 폰이 먼저고 웹은 같은 앱을 넓힌 것인데, 1400pt 짜리 창에서 그대로 늘어나면 52pt 컨트롤
 * 하나가 화면을 가로지르고 16pt 거터는 사라진 것처럼 보인다. **폭을 늘리는 대신 창을 좁힌다** —
 * 레이아웃은 폰에서 검증된 그대로 두고, 그 바깥을 여백으로 처리하는 쪽이다.
 *
 * 네이티브에서는 아무것도 하지 않고(폰은 이미 폰이다), 웹에서도 창이 틀보다 좁으면 그대로
 * 통과시킨다 — 폰 브라우저에 테두리와 여백을 두르면 진짜 화면만 좁아진다.
 *
 * 틀 바깥은 3단계다. `Panel` 이 테두리로 구분되는 것과 반대되는 경우인데, 여기서 구분해야 하는
 * 것은 페이지 안의 한 구획이 아니라 **앱이 아닌 자리**이기 때문이다. 페이지(1단계)가 그 위에
 * 떠 있으려면 바깥이 한 걸음 어두워야 한다.
 *
 * 모서리는 `radius.base`. 폰처럼 보이려면 30 을 넘어야 하지만 스케일에 그런 값이 없고, 네 번째
 * 값을 call site 에 적는 대신 12 로 둔다 — 실제 기기 흉내가 필요해지면 그때 토큰으로 올린다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width <= FRAME_WIDTH) return <>{children}</>;

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

/**
 * 화면 하나가 실제로 쓸 수 있는 폭.
 *
 * `useWindowDimensions().width` 를 폭으로 쓰던 자리가 이 훅을 쓴다. 틀이 생긴 뒤로 창 폭과 앱
 * 폭이 다르고, 그 차이를 모르는 계산은 창 폭만큼 넘기는 페이저처럼 조용히 어긋난다.
 */
export function useFrameWidth() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return width;
  return Math.min(width, FRAME_WIDTH);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSubtle,
  },
  frame: {
    width: FRAME_WIDTH,
    height: '100%',
    maxHeight: FRAME_HEIGHT,
    borderRadius: radius.base,
    /* 모서리를 깎았으면 안쪽도 그 선에서 끊겨야 한다. 폰의 화면 가장자리와 같은 역할이라,
       거터 16 안쪽에서 자라는 컨트롤은 여기에 닿지 않는다. */
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
});
