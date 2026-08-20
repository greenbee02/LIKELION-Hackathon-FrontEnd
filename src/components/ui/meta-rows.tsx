import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/** 값이 없으면 그 줄은 없다 — 그래서 값은 선택이고, 걸러내는 일은 이 컴포넌트가 한다. */
export type MetaRow = { label: string; value?: string | null };

/**
 * 무엇이 무엇인지 적어 두는 두 칸짜리 표.
 *
 * 리워드 상세가 이 모양을 두 번 쓴다 — 위에서는 행사의 기간과 장소를, 아래에서는 해금과
 * 수령의 시각을. **두 곳이 각자 다르게 생겼던 것이 그 화면이 흩어져 보이던 이유의 절반**이
 * 었다: 같은 성격의 것(짧은 라벨 하나에 짧은 값 하나)이 한 번은 표로, 한 번은 문단으로
 * 그려지면 읽는 사람은 그 둘이 다른 종류라고 읽는다.
 *
 * **줄 사이는 6단계 실선으로만 나눈다.** 상자에 담지 않는 이유는 이 표가 글의 일부이기
 * 때문이다 — 본문과 같은 여백 안에서 같은 왼쪽 선에 붙어 있어야 발신 정보로 읽히지, 따로
 * 떠 있는 상자가 되면 본문과 관계없는 것이 된다.
 *
 * **값은 오른쪽에 붙는다.** 라벨의 길이가 제각각이라(“기간” 두 글자와 “운영 시간” 네 글자)
 * 왼쪽 정렬로 두면 값들의 시작점이 들쭉날쭉해지고, 고정 폭 칸을 만들면 가장 긴 라벨이 폭을
 * 정하는 숫자가 하나 생긴다. 오른쪽 끝은 이미 정해져 있는 선이라 아무것도 정할 필요가 없다.
 */
export function MetaRows({ rows }: { rows: MetaRow[] }) {
  const shown = rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
  if (shown.length === 0) return null;

  return (
    <View>
      {shown.map((row, i) => (
        <View key={row.label} style={[styles.row, i === shown.length - 1 && styles.rowLast]}>
          <Text variant="label" tone="muted">
            {row.label}
          </Text>
          <Text variant="body" style={styles.value}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  rowLast: { borderBottomWidth: 0 },
  value: { flex: 1, textAlign: 'right' },
});
