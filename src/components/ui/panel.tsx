import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { allowPressOverflow } from './press-scale';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 한 덩어리의 내용을 배경에서 떼어놓는 상자.
 *
 * 컬렉션 화면이 카드를 아무 틀 없이 늘어놓는 것과 대비된다 — 거기서는 카드가 그림을 갖고
 * 있어서 서로 구분되지만, **그림이 없는 것들은 간격만으로는 나뉘지 않는다.** 리워드 하나,
 * 행사 하나, 케어 서비스 하나는 전부 문장 몇 줄이고, 그것들을 24 간격으로 늘어놓으면 하나의
 * 긴 글로 읽힌다. 상자가 "여기부터 저기까지가 한 건"이라고 말한다.
 *
 * 세 화면(`profile` 의 계정, `reward-entry`, `reward/[id]`)이 각자 같은 세 줄을 적고 있었고,
 * 새 화면들이 같은 모양을 여섯 번 더 필요로 해서 여기로 옮겼다.
 *
 * **`allowPressOverflow` 가 기본으로 들어 있다.** 상자 안의 컨트롤은 눌리면 16% 자라는데,
 * 웹에서는 `View` 가 기본으로 잘라내므로 이 상자가 그 성장을 자르는 첫 번째 경계가 된다.
 * 안에 누를 것이 없는 상자에도 붙여둔다 — 나중에 버튼 하나가 들어왔을 때 모서리가 잘리는
 * 이유를 여기서 찾게 만드는 것보다, 처음부터 자르지 않는 편이 낫다.
 */
export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    padding: space[4],
    borderRadius: radius.base,
    backgroundColor: colors.backgroundSubtle,
    ...allowPressOverflow,
  },
});
