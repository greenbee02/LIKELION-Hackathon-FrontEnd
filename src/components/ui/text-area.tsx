import { AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

export type TextAreaProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  style?: ViewStyle;
};

export function TextArea({ label, error, style, ...rest }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);

  return (
    <View style={style}>
      <Text variant="label" tone="muted" style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, invalid && styles.fieldInvalid]}>
        <TextInput
          {...rest}
          multiline
          textAlignVertical="top"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
        />
      </View>
      {error ? (
        <View style={styles.error}>
          <AlertCircle size={14} color={colors.text} />
          <Text variant="caption" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: space[2] },
  field: {
    minHeight: 116,
    borderRadius: radius.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  fieldFocused: { borderColor: colors.borderStrong },
  fieldInvalid: { borderColor: colors.borderStrong, borderWidth: 1.5 },
  input: { flex: 1, minHeight: 84, color: colors.text, fontSize: 16, lineHeight: 24 },
  error: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[2] },
  errorText: { flex: 1 },
});
