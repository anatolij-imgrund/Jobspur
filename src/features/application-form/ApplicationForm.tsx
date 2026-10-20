import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { DateField } from '@/components/form/DateField';
import { Field } from '@/components/form/Field';
import { TextField } from '@/components/form/TextField';
import { radius, space, type, useTheme } from '@/theme';
import { CHANNEL_LABELS, CHANNELS, SOURCE_LABELS, SOURCES } from '@/types/application';

import { useDiscardGuard } from './useDiscardGuard';
import { applicationFormSchema, type ApplicationFormValues } from './schema';

type Props = {
  defaultValues: ApplicationFormValues;
  submitLabel: string;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
};

/**
 * Formular für neue und bestehende Bewerbungen. Pflichtfelder stehen oben,
 * alles, was beim Eintragen oft noch fehlt, darunter unter „Weitere Angaben“.
 */
export function ApplicationForm({ defaultValues, submitLabel, onSubmit }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const positionRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);
  const contactNameRef = useRef<TextInput>(null);
  const contactEmailRef = useRef<TextInput>(null);
  const jobUrlRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting, isSubmitSuccessful },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
    mode: 'onTouched',
  });

  // Nach erfolgreichem Speichern darf die Seite ohne Rückfrage schließen.
  useDiscardGuard(isDirty && !isSubmitSuccessful && !isSubmitting);

  // Ein Fehler beim Speichern landet als Meldung über dem Knopf. Weil dann
  // ein Fehler im Formular steht, bleibt isSubmitSuccessful false und die
  // Rückfrage beim Verlassen aktiv.
  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      setError('root.save', {
        message: 'Die Bewerbung konnte nicht gespeichert werden. Bitte versuche es noch einmal.',
      });
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Firma" error={errors.company?.message}>
          <Controller
            control={control}
            name="company"
            render={({ field }) => (
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.company}
                placeholder="z. B. Muster GmbH"
                autoCapitalize="words"
                autoFocus
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => positionRef.current?.focus()}
                accessibilityLabel="Firma"
              />
            )}
          />
        </Field>

        <Field label="Stelle" error={errors.position?.message}>
          <Controller
            control={control}
            name="position"
            render={({ field }) => (
              <TextField
                ref={positionRef}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.position}
                placeholder="z. B. Junior Anwendungsentwickler"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => locationRef.current?.focus()}
                accessibilityLabel="Stelle"
              />
            )}
          />
        </Field>

        <Field label="Beworben am" error={errors.appliedAt?.message}>
          <Controller
            control={control}
            name="appliedAt"
            render={({ field }) => (
              <DateField
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.appliedAt}
              />
            )}
          />
        </Field>

        <Field label="Bewerbungsweg" error={errors.channel?.message}>
          <Controller
            control={control}
            name="channel"
            render={({ field }) => (
              <ChoiceGroup
                options={CHANNELS}
                labels={CHANNEL_LABELS}
                value={field.value}
                onChange={field.onChange}
                accessibilityLabel="Bewerbungsweg"
              />
            )}
          />
        </Field>

        <Field
          label="Wie hast du die Stelle gefunden?"
          error={errors.source?.message}
          hint="Vermittlungsvorschläge der Agentur oder des Jobcenters werden im Nachweis gesondert ausgewiesen."
        >
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <ChoiceGroup
                options={SOURCES}
                labels={SOURCE_LABELS}
                value={field.value}
                onChange={field.onChange}
                accessibilityLabel="Quelle der Stelle"
              />
            )}
          />
        </Field>

        <Text style={[styles.groupTitle, { color: theme.muted }]}>Weitere Angaben</Text>

        <Field label="Ort" optional error={errors.location?.message}>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <TextField
                ref={locationRef}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.location}
                placeholder="z. B. Köln oder Remote"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => contactNameRef.current?.focus()}
                accessibilityLabel="Ort"
              />
            )}
          />
        </Field>

        <Field label="Ansprechperson" optional error={errors.contactName?.message}>
          <Controller
            control={control}
            name="contactName"
            render={({ field }) => (
              <TextField
                ref={contactNameRef}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.contactName}
                placeholder="z. B. Frau Berger"
                autoCapitalize="words"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => contactEmailRef.current?.focus()}
                accessibilityLabel="Ansprechperson"
              />
            )}
          />
        </Field>

        <Field label="E-Mail der Ansprechperson" optional error={errors.contactEmail?.message}>
          <Controller
            control={control}
            name="contactEmail"
            render={({ field }) => (
              <TextField
                ref={contactEmailRef}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.contactEmail}
                placeholder="name@firma.de"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => jobUrlRef.current?.focus()}
                accessibilityLabel="E-Mail der Ansprechperson"
              />
            )}
          />
        </Field>

        <Field label="Link zur Stellenanzeige" optional error={errors.jobUrl?.message}>
          <Controller
            control={control}
            name="jobUrl"
            render={({ field }) => (
              <TextField
                ref={jobUrlRef}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.jobUrl}
                placeholder="https://"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Link zur Stellenanzeige"
              />
            )}
          />
        </Field>

        <Field label="Notizen" optional error={errors.notes?.message}>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                invalid={!!errors.notes}
                placeholder="z. B. Gehaltsvorstellung, Besonderheiten der Anzeige"
                multiline
                accessibilityLabel="Notizen"
              />
            )}
          />
        </Field>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.line,
            paddingBottom: Math.max(insets.bottom, space.md),
          },
        ]}
      >
        {errors.root?.save && (
          <Text
            style={[styles.saveError, { color: theme.danger }]}
            accessibilityLiveRegion="assertive"
          >
            {errors.root.save.message}
          </Text>
        )}
        <Pressable
          onPress={submit}
          disabled={isSubmitting}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: theme.accent, opacity: pressed || isSubmitting ? 0.85 : 1 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.accentInk} />
          ) : (
            <Text style={[styles.submitText, { color: theme.accentInk }]}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  groupTitle: { ...type.label, marginTop: space.sm, marginBottom: -space.sm },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submit: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { ...type.body, fontWeight: '600' },
  saveError: { ...type.small, marginBottom: space.sm },
});
