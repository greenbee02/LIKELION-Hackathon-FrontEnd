import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

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
 * `inverted` 는 색 면 위에 설 때다(리워드 카드) — 그 위에서는 회색 단계가 전부 얼룩이라
 * 무게를 색으로 낼 수 없고, 대신 버튼이 아니라는 사실을 생김새가 통째로 말한다.
 *
 * **`variant` 는 두 값뿐이다.** 기본은 `label`(14/500). `caption`(12/400)은 목록의 카드마다
 * 하나씩 반복되는 링크의 것이다 — 같은 글자가 여섯 번 되풀이될 때는 그것이 길이라는 사실만
 * 남으면 되고, 매번 또렷할 이유가 없다. 그보다 굵은 역할은 주지 않는다: 그 무게는 버튼의
 * 것이고, 이 컴포넌트가 존재하는 이유가 버튼이 아니라는 것이다.
 *
 * **`chevron` 은 "여기서 다른 화면으로 간다"를 뜻한다.** 되돌릴 수 없는 조작이나 같은
 * 화면에서 끝나는 길에는 붙이지 않는다 — 꺾쇠가 붙은 글자는 눌렀을 때 화면이 바뀔 것이라고
 * 약속하는 것이고, 지키지 못할 약속이면 안 하는 편이 낫다.
 */
export function TextLink({
  label,
  onPress,
  tone = 'muted',
  variant = 'label',
  align = 'center',
  chevron = false,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'muted' | 'inverted';
  /** `label`(14/500)이 기본. 목록에서 되풀이되는 링크만 `caption`(12/400)으로 물러난다. */
  variant?: 'label' | 'caption';
  /** 눌리면 다른 화면으로 간다는 표시. 같은 화면에서 끝나는 길에는 붙이지 않는다. */
  chevron?: boolean;
  /**
   * 문단 안에 놓이는 링크는 왼쪽에, 화면 바닥에 홀로 서는 링크는 가운데에, 줄의 오른쪽 끝을
   * 차지하는 링크는 `end` 에. 세 경우 다 좌우 패딩이 만든 들여쓰기를 바깥쪽으로 상쇄해야
   * 글자가 다른 것들과 같은 선에 선다.
   */
  align?: 'center' | 'start' | 'end';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        align === 'center' ? styles.center : align === 'end' ? styles.end : styles.start,
        pressed && (tone === 'inverted' ? styles.pressedOnColor : styles.pressed),
        style,
      ]}
    >
      <View style={styles.row}>
        <Text variant={variant} tone={tone}>
          {label}
        </Text>
        {chevron ? (
          /* 글자와 같은 크기, 같은 색, 같은 굵기 — 꺾쇠는 아이콘이 아니라 문장의 마지막
             글자다. 획 굵기까지 활자를 따라가지 않으면 글자 옆에 붙은 다른 물건이 된다. */
          <ChevronRight
            size={variant === 'caption' ? 14 : 16}
            color={INK[tone]}
            strokeWidth={variant === 'caption' ? 2 : 2.5}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

/** `Text` 의 tone 세 단계를, 꺾쇠가 같은 색을 쓸 수 있도록 색으로 편 것. */
const INK: Record<'default' | 'muted' | 'inverted', string> = {
  default: colors.text,
  muted: colors.textMuted,
  inverted: colors.textInverted,
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  link: {
    alignItems: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.base,
  },
  center: { alignSelf: 'center' },
  /* 문단에 붙는 링크는 글이 시작하는 선에 서야 하므로, 좌우 패딩이 만든 들여쓰기를 상쇄한다. */
  start: { alignSelf: 'flex-start', marginLeft: -space[4] },
  end: { alignSelf: 'flex-end', marginRight: -space[4] },
  pressed: { backgroundColor: colors.surface },
  /* 색 면 위에서는 3단계 회색이 얼룩이 된다 — 흰색을 아주 옅게 깐 것이 같은 일을 한다. */
  pressedOnColor: { backgroundColor: colors.wellOnColor },
});
