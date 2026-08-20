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
 */

/** 한 행의 오른쪽에 이름을 밀어내지 않고 들어가는 최대 개수. */
const MAX_DRAWN = 5;

export function TicketProgress({ progress, total }: { progress: number; total: number }) {
  const value = (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: progress }}
    >
      {total > MAX_DRAWN ? (
        <Text variant="action">
          {progress} / {total}장
        </Text>
      ) : (
        Array.from({ length: total }, (_, i) => (
          <Ticket
            key={i}
            size={24}
            strokeWidth={2}
            /* 모은 것은 12단계 윤곽에 6단계 속, 아직인 것은 7단계 윤곽뿐. 색이 아니라 무게로
               갈리므로 팔레트에 색이 없다는 사실과 어긋나지 않는다. */
            color={i < progress ? colors.text : colors.border}
            fill={i < progress ? colors.borderSubtle : 'transparent'}
          />
        ))
      )}
    </View>
  );

  return value;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
