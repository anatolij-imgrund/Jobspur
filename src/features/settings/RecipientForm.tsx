import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { Field } from '@/components/form/Field';
import { FormGroupTitle, FormLayout } from '@/components/form/FormLayout';
import { FormTextField } from '@/components/form/FormTextField';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { space } from '@/theme';
import { RECIPIENT_KIND_LABELS, RECIPIENT_KINDS, type RecipientKind } from '@/types/profile';

import { recipientSchema, type RecipientFormValues } from './schemas';

type Props = {
  defaultValues: RecipientFormValues;
  submitLabel: string;
  onSubmit: (values: RecipientFormValues) => Promise<void>;
  footerExtra?: ReactNode;
};

const DEFAULT_NAMES = Object.values(RECIPIENT_KIND_LABELS);

export function RecipientForm({ defaultValues, submitLabel, onSubmit, footerExtra }: Props) {
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty, isSubmitting, isSubmitSuccessful },
  } = useForm<RecipientFormValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues,
    mode: 'onTouched',
  });

  useDiscardGuard(isDirty && !isSubmitSuccessful && !isSubmitting);

  const kind = useWatch({ control, name: 'kind' });

  // Wer die Art wechselt, bekommt den passenden Namen vorgeschlagen,
  // solange noch kein eigener eingetragen ist.
  const changeKind = (next: RecipientKind, onChange: (v: RecipientKind) => void) => {
    onChange(next);
    const name = getValues('name').trim();
    if (name === '' || DEFAULT_NAMES.includes(name)) {
      setValue('name', next === 'other' ? '' : RECIPIENT_KIND_LABELS[next], { shouldDirty: true });
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      setError('root.save', {
        message: 'Die Stelle konnte nicht gespeichert werden. Bitte versuche es noch einmal.',
      });
    }
  });

  return (
    <FormLayout
      submitLabel={submitLabel}
      onSubmit={submit}
      submitting={isSubmitting}
      error={errors.root?.save?.message}
      footerExtra={footerExtra}
    >
      <Field label="Art der Stelle" error={errors.kind?.message}>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <ChoiceGroup
              options={RECIPIENT_KINDS}
              labels={RECIPIENT_KIND_LABELS}
              value={field.value}
              onChange={(next) => changeKind(next, field.onChange)}
              accessibilityLabel="Art der Stelle"
            />
          )}
        />
      </Field>

      <FormTextField
        control={control}
        name="name"
        label="Name"
        hint="So erscheint die Stelle im Nachweis, z. B. „Jobcenter Köln“."
        error={errors.name?.message}
        placeholder="z. B. Agentur für Arbeit Köln"
        autoCapitalize="words"
      />

      <FormTextField
        control={control}
        name="customerNumber"
        label="Kundennummer"
        optional
        hint="Steht auf jedem Schreiben der Stelle, meist oben rechts."
        error={errors.customerNumber?.message}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {kind === 'jobcenter' && (
        <FormTextField
          control={control}
          name="bgNumber"
          label="BG-Nummer"
          optional
          hint="Nummer der Bedarfsgemeinschaft, steht auf dem Bescheid."
          error={errors.bgNumber?.message}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      )}

      <FormTextField
        control={control}
        name="contactPerson"
        label="Ansprechperson"
        optional
        error={errors.contactPerson?.message}
        placeholder="z. B. Herr Schmidt"
        autoCapitalize="words"
      />

      <FormGroupTitle>Anschrift für den Postweg</FormGroupTitle>
      <FormTextField
        control={control}
        name="street"
        label="Straße und Hausnummer"
        optional
        hint="Mit Anschrift wird der Nachweis als Brief für einen Fensterumschlag gesetzt."
        error={errors.street?.message}
        autoCapitalize="words"
      />

      <View style={styles.row}>
        <View style={styles.zip}>
          <FormTextField
            control={control}
            name="zip"
            label="PLZ"
            error={errors.zip?.message}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={styles.city}>
          <FormTextField
            control={control}
            name="city"
            label="Ort"
            error={errors.city?.message}
            autoCapitalize="words"
          />
        </View>
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  zip: { width: 104 },
  city: { flex: 1 },
});
