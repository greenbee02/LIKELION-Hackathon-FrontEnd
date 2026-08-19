import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * 버튼 무게를 갖지 않는 조작.
 *
 * 한 화면에 똑같이 큰 버튼이 둘이면 그 화면은 자기가 무엇을 위한 곳인지 정하지 않은 것이다.
 * 그렇다고 두 번째 길을 없앨 수는 없는 화면이 많다 — 카드 상세에는 공유 말고도 편집과 케어가
 * 있고, 컬렉션 상세에는 삭제가 있으며, 온보딩에는 건너뛰기가 있다. **이 컴포넌트는 "있지만
 * 이 화면의 목적은 아닌" 길의 생김새다.**
 *
 * 세 화면(`profile` 의 회원 탈퇴, `sign-in` 의 이메일 가입·로그인)이 각자 같은 다섯 줄을
 * 적고 있었다.
 *
 * **누를 때 자라지 않는다.** `AGENTS.md` 가 `Checkbox` 와 함께 이것을 프레스 성장에서 명시적으로
 * 뺐다 — 성장은 손가락 아래 있는 것이 물건일 때 뜻이 통하고, 글자는 물건이 아니다. 대신
 * 눌린 동안 3단계 바탕이 깔린다. 밑줄은 긋지 않는다.
 *
 * `tone` 은 `Text` 의 것을 그대로 쓴다. 기본은 `muted`(11단계) — 부차적인 길이라는 사실이
 * 무게로 드러나야 한다. 되돌릴 수 없는 조작(컬렉션 삭제)만 `default`(12단계)로 올린다.
 */
export function TextLink({
  label,
  onPress,
  tone = 'muted',
  align = 'center',
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'muted';
  /** 문단 안에 놓이는 링크는 왼쪽에, 화면 바닥에 홀로 서는 링크는 가운데에. */
  align?: 'center' | 'start';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        align === 'center' ? styles.center : styles.start,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text variant="label" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.base,
  },
  center: { alignSelf: 'center' },
  /* 문단에 붙는 링크는 글이 시작하는 선에 서야 하므로, 좌우 패딩이 만든 들여쓰기를 상쇄한다. */
  start: { alignSelf: 'flex-start', marginLeft: -space[4] },
  pressed: { backgroundColor: colors.surface },
});
