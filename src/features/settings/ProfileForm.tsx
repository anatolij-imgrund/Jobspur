import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { FormGroupTitle, FormLayout } from '@/components/form/FormLayout';
import { FormTextField } from '@/components/form/FormTextField';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { space } from '@/theme';

import { profileSchema, type ProfileFormValues } from './schemas';

type Props = {
  defaultValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

export function ProfileForm({ defaultValues, onSubmit }: Props) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting, isSubmitSuccessful },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onTouched',
  });

  useDiscardGuard(isDirty && !isSubmitSuccessful && !isSubmitting);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      setError('root.save', {
        message: 'Deine Angaben konnten nicht gespeichert werden. Bitte versuche es noch einmal.',
      });
    }
  });

  return (
    <FormLayout
      submitLabel="Angaben speichern"
      onSubmit={submit}
      submitting={isSubmitting}
      error={errors.root?.save?.message}
    >
      <FormTextField
        control={control}
        name="name"
        label="Vor- und Nachname"
        hint="Steht oben im Nachweis und unter der Unterschrift."
        error={errors.name?.message}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />

      <FormGroupTitle>Anschrift</FormGroupTitle>
      <FormTextField
        control={control}
        name="street"
        label="Straße und Hausnummer"
        optional
        error={errors.street?.message}
        autoCapitalize="words"
        autoComplete="street-address"
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
            autoComplete="postal-code"
          />
        </View>
        <View style={styles.city}>
          <FormTextField
            control={control}
            name="city"
            label="Ort"
            hint="Auch für „Ort, Datum“ unter der Unterschrift."
            error={errors.city?.message}
            autoCapitalize="words"
          />
        </View>
      </View>

      <FormGroupTitle>Kontakt</FormGroupTitle>
      <FormTextField
        control={control}
        name="phone"
        label="Telefon"
        optional
        error={errors.phone?.message}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <FormTextField
        control={control}
        name="email"
        label="E-Mail"
        optional
        error={errors.email?.message}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  zip: { width: 104 },
  city: { flex: 1 },
});
