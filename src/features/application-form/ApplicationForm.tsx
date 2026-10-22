import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { DateField } from '@/components/form/DateField';
import { Field } from '@/components/form/Field';
import { FormGroupTitle, FormLayout } from '@/components/form/FormLayout';
import { TextField } from '@/components/form/TextField';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { formatDate } from '@/lib/dates';
import {
  CHANNEL_LABELS,
  CHANNELS,
  SOURCE_LABELS,
  SOURCES,
  type Stage,
  STAGES,
} from '@/types/application';

import { applicationFormSchema, type ApplicationFormValues } from './schema';

const STAGE_LABELS: Record<Stage, string> = {
  applied: 'Ja, beworben',
  saved: 'Nein, erst vormerken',
};

type Props = {
  defaultValues: ApplicationFormValues;
  /** Beim Anlegen: Frage „Schon abgeschickt?“ zeigen */
  chooseStage?: boolean;
  submitLabel: string;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  /**
   * Beim Bearbeiten: Datum des frühesten späteren Verlaufseintrags.
   * Das Bewerbungsdatum darf nicht danach liegen.
   */
  latestAppliedAt?: string | null;
};

/**
 * Formular für neue und bestehende Bewerbungen. Pflichtfelder stehen oben,
 * alles, was beim Eintragen oft noch fehlt, darunter unter „Weitere Angaben“.
 */
export function ApplicationForm({
  defaultValues,
  chooseStage = false,
  submitLabel,
  onSubmit,
  latestAppliedAt,
}: Props) {
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

  const saved = useWatch({ control, name: 'stage' }) === 'saved';

  // Nach erfolgreichem Speichern darf die Seite ohne Rückfrage schließen.
  useDiscardGuard(
    isDirty && !isSubmitSuccessful && !isSubmitting,
    'Die Bewerbung ist noch nicht gespeichert.',
  );

  // Ein Fehler beim Speichern landet als Meldung über dem Knopf. Weil dann
  // ein Fehler im Formular steht, bleibt isSubmitSuccessful false und die
  // Rückfrage beim Verlassen aktiv.
  const submit = handleSubmit(async (values) => {
    if (latestAppliedAt && values.appliedAt > latestAppliedAt) {
      setError('appliedAt', {
        message: `Im Verlauf steht schon ein Eintrag vom ${formatDate(latestAppliedAt)}. Das Bewerbungsdatum muss davor liegen.`,
      });
      return;
    }
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
    <FormLayout
      submitLabel={chooseStage && saved ? 'Stelle vormerken' : submitLabel}
      onSubmit={submit}
      submitting={isSubmitting}
      error={errors.root?.save?.message}
    >
      {chooseStage && (
        <Field
          label="Schon abgeschickt?"
          hint={
            saved
              ? 'Die Stelle zählt erst als Bewerbung, wenn du sie später auf „Beworben“ setzt. Bis dahin steht sie nicht im Nachweis.'
              : undefined
          }
        >
          <Controller
            control={control}
            name="stage"
            render={({ field }) => (
              <ChoiceGroup
                options={STAGES}
                labels={STAGE_LABELS}
                value={field.value}
                onChange={field.onChange}
                accessibilityLabel="Schon abgeschickt?"
              />
            )}
          />
        </Field>
      )}

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

      {/* Beim Vormerken ist das Datum einfach heute; nur beim Bearbeiten wählbar. */}
      {!(chooseStage && saved) && (
        <Field label={saved ? 'Vorgemerkt am' : 'Beworben am'} error={errors.appliedAt?.message}>
          <Controller
            control={control}
            name="appliedAt"
            render={({ field }) => (
              <DateField
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.appliedAt}
                accessibilityLabel={saved ? 'Vorgemerkt am' : 'Beworben am'}
              />
            )}
          />
        </Field>
      )}

      <Field
        label={saved ? 'Wie willst du dich bewerben?' : 'Bewerbungsweg'}
        error={errors.channel?.message}
      >
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

      <FormGroupTitle>Weitere Angaben</FormGroupTitle>

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
    </FormLayout>
  );
}
