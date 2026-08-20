import { AlertCircle, Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { GeneratingSpinner } from './generating-spinner';
import { Text } from './text';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';

export type ChecklistStatus = 'pending' | 'done' | 'failed';

export type ChecklistItem = {
  key: string;
  label: string;
  status: ChecklistStatus;
  /** 오른쪽 끝에 적힐 말. 없으면 상태에 따라 `완료`·`실패`·`생성 중`. */
  note?: string;
};

const DEFAULT_NOTE: Record<ChecklistStatus, string> = {
  done: '완료',
  failed: '실패',
  pending: '생성 중',
};

/**
 * 기다림을 읽을 거리로 바꾸는 몇 줄.
 *
 * 스피너 하나는 "기다려라"만 말하지만, 실제로 벌어지는 일은 여러 개가 따로 만들어지고 서로
 * 다른 시각에 끝나는 것이다. 이름을 붙이고 각각 따로 정착시키면 대기가 읽히고, 고객은 그것이
 * 움직이고 있다는 것을 볼 수 있다.
 *
 * 발급 화면(`issue/[token]`)에서 태어나 로컬로 살았고, 그 파일의 주석이 "커스텀 화면이 같은
 * 모양을 원할 것"이라고 예고해 두었다. 카드 편집이 그 두 번째 화면이라 여기로 옮겼다.
 *
 * **무엇을 만들고 있는지는 이 컴포넌트가 모른다.** 승격하면서 `RESOURCE_LABELS` 의존을
 * 호출부로 밀어냈다 — 발급은 배경·테두리·패턴 셋을, 편집은 장식·팔레트·글자·구성 넷을 만드는데,
 * 그 목록을 아는 것은 각 화면의 일이지 줄을 그리는 쪽의 일이 아니다.
 *
 * 실패한 줄은 색을 쓰지 않는다. `Input` 의 규칙 그대로 — 아이콘이 나타나고 상태 글자가
 * 11단계에서 12단계로 올라선다.
 */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <View>
      {items.map((item) => {
        const done = item.status === 'done';
        const failed = item.status === 'failed';

        return (
          <View key={item.key} style={styles.row}>
            <View style={styles.slot}>
              {done ? <Check size={16} color={colors.text} strokeWidth={2.5} /> : null}
              {failed ? <AlertCircle size={16} color={colors.text} /> : null}
              {!done && !failed ? <GeneratingSpinner size={16} /> : null}
            </View>

            <Text variant="body" tone={done || failed ? 'default' : 'muted'} style={styles.label}>
              {item.label}
            </Text>

            <Text variant="caption" tone={failed ? 'default' : 'muted'}>
              {item.note ?? DEFAULT_NOTE[item.status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  slot: { width: 20, alignItems: 'center' },
  label: { flex: 1, marginLeft: space[3] },
});
