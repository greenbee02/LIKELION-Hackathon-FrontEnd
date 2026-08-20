import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import { type as typeRoles } from '@/theme/typography';

/** 점은 4pt 다 — 이보다 크면 글머리가 아니라 항목의 상태 표시처럼 읽힌다. */
const DOT = 4;

/**
 * 이 리워드가 실제로 주는 것들.
 *
 * **화면에서 답해야 할 질문 하나가 여기 있다 — “그래서 뭘 받는데”.** 앞의 절들은 무엇인지와
 * 언제 어디인지를 말하고, 이 절만 결과를 말한다. 잠긴 리워드에서는 이것이 계속 모을 이유가
 * 되고, 열린 리워드에서는 카운터에서 무엇을 달라고 해야 하는지가 된다.
 *
 * **상자에 담지 않는다.** 한 번 `Panel` 에 넣어 봤는데, 그러면 글 한복판에 상자 하나가 떠서
 * 앞뒤 문단과 관계가 끊긴다 — 이 화면에서 테두리를 두르는 것은 수령 코드 하나뿐이고, 그
 * 하나뿐이어야 그것이 주인공이라는 뜻이 된다.
 *
 * **점은 번호가 아니다.** 순서가 있는 절차라면 1·2·3 이 맞지만 이것들은 한꺼번에 주어지는
 * 것이라, 번호를 붙이면 없는 순서를 읽게 만든다.
 */
export function RewardBenefits({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={item} style={[styles.row, i > 0 && styles.rowGap]}>
          {/* 점은 첫 줄의 한가운데에 선다 — 줄이 두 줄로 넘어가도 위치가 그대로여야 하므로
              세로 가운데 정렬이 아니라 첫 줄 높이(`body` 의 행간)에 맞춘 칸을 쓴다. */}
          <View style={styles.bullet}>
            <View style={styles.dot} />
          </View>
          <Text variant="body" style={styles.label}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  rowGap: { marginTop: space[3] },
  bullet: { width: DOT, height: typeRoles.body.lineHeight, justifyContent: 'center' },
  /* 9단계 — 글자(12)보다 확실히 뒤에 있으면서 6단계 테두리처럼 사라지지는 않는다. */
  dot: { width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: colors.solid },
  label: { flex: 1 },
});
