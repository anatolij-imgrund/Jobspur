import { type Ref } from 'react';
import { type Control, Controller, type FieldValues, type Path } from 'react-hook-form';
import type { TextInput, TextInputProps } from 'react-native';

import { Field } from './Field';
import { TextField } from './TextField';

type Props<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T>;
  name: Path<T>;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  inputRef?: Ref<TextInput>;
};

/** Textfeld samt Beschriftung und Fehlermeldung, direkt an react-hook-form gebunden. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  optional,
  hint,
  error,
  inputRef,
  ...inputProps
}: Props<T>) {
  return (
    <Field label={label} optional={optional} hint={hint} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TextField
            ref={inputRef}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            invalid={!!error}
            accessibilityLabel={label}
            {...inputProps}
          />
        )}
      />
    </Field>
  );
}
