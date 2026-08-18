import { AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';
import { type as typeRoles } from '@/theme/typography';

/**
 * `TextInput` takes flat text props rather than a style role, so the body role is spread in —
 * minus `lineHeight`, which Android applies to the editing box and clips descenders with.
 */
const { lineHeight: _bodyLineHeight, ...bodyText } = typeRoles.body;

export type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Appends the asterisk that marks a field the form will not submit without. */
  required?: boolean;
  /** A message under the field. Its presence is what puts the field in its error state. */
  error?: string | null;
  /** Adds the show/hide toggle and starts obscured. */
  password?: boolean;
  style?: ViewStyle;
};

/**
 * A labelled field, 52pt to match `Button` so a form reads as one stack of controls.
 *
 * **The error state carries no colour, because the palette has none.** A gray-only system cannot
 * spell "red border", so an invalid field says so three other ways at once: the border steps up
 * to 8, an icon appears, and the message sits at step 12 rather than the muted 11. That is the
 * convention for every error surface in this app, not a workaround local to this file.
 */
export function Input({ label, required = false, error, password = false, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const invalid = Boolean(error);

  return (
    <View style={style}>
      <Text variant="label" tone="muted" style={styles.label}>
        {label}
        {required ? '*' : ''}
      </Text>

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          invalid && styles.fieldInvalid,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? '비밀번호 가리기' : '비밀번호 보기'}
            hitSlop={space[2]}
            onPress={() => setRevealed((v) => !v)}
          >
            {revealed ? (
              <EyeOff size={20} color={colors.textMuted} />
            ) : (
              <Eye size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.error}>
          <AlertCircle size={14} color={colors.text} />
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space[2] },
  field: {
    height: 52,
    borderRadius: radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldFocused: { borderColor: colors.borderStrong },
  fieldInvalid: { borderColor: colors.borderStrong, borderWidth: 1.5 },
  input: {
    ...bodyText,
    flex: 1,
    height: '100%',
    color: colors.text,
  },
  error: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[2] },
  errorText: { flex: 1 },
});
