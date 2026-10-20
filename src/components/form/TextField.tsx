import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { radius, space, type, useTheme } from '@/theme';

type Props = TextInputProps & { invalid?: boolean };

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { invalid, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = invalid ? theme.danger : focused ? theme.accent : theme.line;

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.muted}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        multiline && styles.multiline,
        {
          color: theme.ink,
          backgroundColor: theme.surface,
          borderColor,
          borderWidth: focused || invalid ? 1.5 : 1,
        },
        style,
      ]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    ...type.body,
    minHeight: 48,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
