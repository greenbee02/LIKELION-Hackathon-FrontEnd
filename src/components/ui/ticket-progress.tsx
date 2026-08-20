import { Ticket } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

/**
 * 리워드까지 남은 거리를, 채워지는 줄이 아니라 세어지는 표로.
 *
 * 게이지 바는 **0장일 때 아무 말도 하지 않는다.** 리워드 목록에서 가장 흔한 상태가 정확히
 * 그것이고, 빈 회색 줄이 다섯 개 그어져 있으면 "몇 장이 필요한가"라는, 행동으로 옮길 수 있는
 * 유일한 사실이 숫자 한 줄에만 남는다. 표 세 장이 비어 있으면 세 장이 필요하다 — 비어 있을
 * 때도 개수를 말하는 것이 이것이 바를 대신하는 이유다.
 *
 * **행의 오른쪽 끝에 선다.** 목록의 각 줄은 아이콘·이름·값으로 읽히고, 리워드에서 값에
 * 해당하는 것이 이것이다. 그래서 크기는 24 — 이름과 같은 줄에 서면서 이름을 밀어내지 않는
 * 최대치다.
 *
 * **다섯 장까지만 그린다.** 그보다 많으면 이름이 설 자리가 없어지고, 두 줄로 접히는 순간
 * 세는 일이 읽기가 아니라 계산이 된다. 그 위로는 숫자가 표보다 정확하다.
 *
 * **`tone` 은 어느 바닥 위에 서는지를 말한다.** 리워드 목록의 패널이 컬렉션 색으로 꽉 찬
 * 면이 되면서, 회색 단계로 그린 표는 그 위에서 보이지 않게 됐다 — 12단계 윤곽은 진한 색
 * 위에서 색과 뒤엉키고 7단계는 아예 사라진다. `inverted` 는 같은 규칙을 흰색으로 다시
 * 적용한다: 모은 것은 꽉 찬 흰 표, 아직인 것은 옅어진 흰 윤곽. **여기서도 색이 아니라
 * 무게로 갈리므로** 팔레트에 색이 없다는 사실과 어긋나지 않는다.
 */

/** 한 행의 오른쪽에 이름을 밀어내지 않고 들어가는 최대 개수. */
const MAX_DRAWN = 5;

export function TicketProgress({
  progress,
  total,
  tone = 'default',
}: {
  progress: number;
  total: number;
  tone?: 'default' | 'inverted';
}) {
  const inverted = tone === 'inverted';
  const value = (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: progress }}
    >
      {total > MAX_DRAWN ? (
        <Text variant="action" tone={inverted ? 'inverted' : 'default'}>
          {progress} / {total}장
        </Text>
      ) : (
        Array.from({ length: total }, (_, i) => {
          const held = i < progress;
          /* 모은 것은 12단계 윤곽에 6단계 속, 아직인 것은 7단계 윤곽뿐. 색이 아니라 무게로
             갈린다. 색 면 위에서는 같은 대비를 흰색 하나와 투명도로 만든다 — 흰 단계는
             하나뿐이라 두 번째 밝기를 만들 방법이 그것밖에 없다. */
          const paint = inverted
            ? { color: colors.textInverted, fill: held ? colors.textInverted : 'transparent' }
            : { color: held ? colors.text : colors.border, fill: held ? colors.borderSubtle : 'transparent' };

          return (
            <View key={i} style={inverted && !held ? styles.ghost : undefined}>
              <Ticket size={24} strokeWidth={2} {...paint} />
            </View>
          );
        })
      )}
    </View>
  );

  return value;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  /* 아직 모으지 않은 표. 흰 윤곽 그대로 두면 꽉 찬 표와 굵기가 같아 둘이 구분되지 않는다. */
  ghost: { opacity: 0.55 },
});
