import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import { type as typeRoles } from '@/theme/typography';

/** `TextInput` 은 역할이 아니라 납작한 텍스트 속성을 받는다. `Input` 과 같은 이유로
 *  `lineHeight` 는 뺀다 — 안드로이드가 편집 상자에 적용해 글자 아래를 잘라낸다. */
const { lineHeight: _labelLineHeight, ...labelText } = typeRoles.label;

export type ChipItem = { key: string; label: string };

/**
 * 「직접 입력」 칩의 상태와 손잡이.
 *
 * `active` 인 동안 이 칩은 **자기 자리에서 입력 상자가 된다.** 아래에 칸을 하나 더 열지
 * 않는 이유는, 그러면 고른 자리와 적는 자리가 떨어져 화면이 다시 길어지고, 방금 줄이려던
 * 그 모양으로 돌아가기 때문이다.
 */
export type ChipCustom = {
  /** 눌리기 전 칩에 적히는 말. */
  label: string;
  value: string;
  active: boolean;
  onActivate: () => void;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

/**
 * 몇 안 되는 값 중 하나를 눌러서 고르는 줄.
 *
 * **빈 칸을 채우게 하는 대신 이미 쓰인 말을 고르게 한다.** 자유 입력은 무엇이든 쓸 수 있어서
 * 아무것도 쓰지 못하게 만든다 — "모티프"라는 라벨과 빈 상자 앞에서 고객이 하는 일은 대개
 * 아무것도 적지 않고 넘어가는 것이다. 고를 수 있는 말 서넛이 놓이면 그 말들이 곧 "여기에는
 * 이런 것을 적으면 됩니다"라는 설명이 된다.
 *
 * **`Dropdown` 과 나누는 기준은 개수다.** 여덟 종류처럼 한 줄에 늘어놓을 수 없는 목록은
 * 드롭다운의 것이고(꾸미기의 종류 고르기가 그렇다), 서넛은 접힌 목록 뒤에 숨길 이유가
 * 없다 — 펼치는 손짓 하나가 고르는 손짓보다 비싸진다.
 *
 * **선택은 한 번 더 누르면 풀린다.** 여기 오는 항목은 전부 선택 사항이라, 한 번 누른 값을
 * 되돌릴 방법이 없으면 고객은 고르기를 망설이게 된다. 되돌림이 없어야 하는 자리라면 이
 * 컴포넌트가 아니라 `Dropdown` 이다.
 */
export function ChipGroup({
  items,
  selected,
  onSelect,
  custom,
  accessibilityLabel,
  style,
}: {
  items: readonly ChipItem[];
  /** 고른 항목의 `key`. 아무것도 고르지 않았으면 `null`. */
  selected: string | null;
  /** 고른 것을 다시 누르면 같은 `key` 가 온다 — 푸는 것은 부르는 쪽이 정한다. */
  onSelect: (key: string) => void;
  /** 줄의 마지막에 서서, 눌리면 그 자리에서 입력 상자가 되는 칩. */
  custom?: ChipCustom;
  accessibilityLabel: string;
  style?: ViewStyle;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.group, style]}
    >
      {items.map((item) => (
        <Chip
          key={item.key}
          label={item.label}
          selected={item.key === selected}
          onPress={() => onSelect(item.key)}
        />
      ))}
      {custom ? <InputChip {...custom} /> : null}
    </View>
  );
}

/**
 * 눌리면 그 자리에서 적을 수 있게 되는 칩.
 *
 * 켜진 동안 칠하지 않는 이유가 있다 — 칠한 면은 "골랐다"는 뜻이고, 여기서 켜졌다는 것은
 * 아직 적는 중이라는 뜻이다. 대신 `Input` 이 초점을 받았을 때와 같은 방식으로 말한다:
 * 테두리가 8단계로 올라선다.
 */
function InputChip({
  label,
  value,
  active,
  onActivate,
  onChangeText,
  placeholder,
}: ChipCustom) {
  if (!active) {
    return <Chip label={label} selected={false} onPress={onActivate} />;
  }

  return (
    <View style={[styles.chip, styles.chipEditing]}>
      <TextInput
        autoFocus
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        returnKeyType="done"
        style={styles.chipInput}
      />
    </View>
  );
}

/**
 * 낱개 칩. 고른 것은 12단계로 칠하고 글자를 뒤집는다 — 회색만 있는 팔레트에서 "고름"을
 * 말하는 방법은 테두리의 굵기가 아니라 면과 글자의 뒤집힘이다.
 *
 * **누를 때 자라지 않는다.** 여러 개가 한 줄에 붙어 서므로 하나가 자라면 옆이 밀려 보이고,
 * 줄바꿈이 걸린 줄에서는 아래 줄까지 흔들린다.
 */
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text variant="label" tone={selected ? 'inverted' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.text, borderColor: colors.text },
  chipPressed: { backgroundColor: colors.surface },
  chipEditing: { borderColor: colors.borderStrong, justifyContent: 'center' },
  /* 적는 동안 칩이 글자를 따라 늘어나되, 한 줄을 통째로 먹지는 않는다. */
  chipInput: { ...labelText, minWidth: 96, maxWidth: 220, padding: 0, color: colors.text },
});
