import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ChoiceGroup } from '@/components/form/ChoiceGroup';
import { DateField } from '@/components/form/DateField';
import { Field } from '@/components/form/Field';
import { TextField } from '@/components/form/TextField';
import { TimeField } from '@/components/form/TimeField';
import { useNow } from '@/hooks/useNow';
import { formatDate, formatWeekdayDate, toIsoDate, toLocalDateTime } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import {
  INTERVIEW_MODE_LABELS,
  INTERVIEW_MODES,
  type InterviewMode,
  NEXT_STATUSES,
  type NewStatusEvent,
  STATUS_LABELS,
  type Status,
  type StatusEvent,
} from '@/types/application';

export type SaveStatusOptions = {
  /** Geplante Gespräche nach dem neuen Datum entfernen */
  dropLaterInterviews: boolean;
  /** Erinnerungen für ein künftiges Gespräch planen */
  remind: boolean;
};

type Props = {
  current: Status;
  /**
   * Datum des letzten Eintrags, der nicht in der Zukunft liegt.
   * Ein neuer Eintrag kann nicht davor liegen.
   */
  floorDate: string;
  /** Nächstes geplantes Gespräch, falls vorhanden */
  upcomingInterview: StatusEvent | null;
  onSave: (event: NewStatusEvent, options: SaveStatusOptions) => Promise<void>;
};

const NOTE_PLACEHOLDER: Partial<Record<Status, string>> = {
  applied: 'z. B. Lebenslauf und Zeugnisse per E-Mail an Frau Berger',
  interview: 'z. B. Adresse, Ansprechperson, Link zum Videocall',
  rejected: 'z. B. Absage per E-Mail, Begründung',
  offer: 'z. B. Start zum 1. Dezember',
};

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

/**
 * Status wählen, dann klappen darunter die passenden Felder auf.
 * Beim Gespräch zusätzlich Uhrzeit, Art und Erinnerung.
 */
export function StatusChanger({ current, floorDate, upcomingInterview, onSave }: Props) {
  const theme = useTheme();
  const now = useNow();
  const [selected, setSelected] = useState<Status | null>(null);
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<InterviewMode>('onsite');
  const [remind, setRemind] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = NEXT_STATUSES[current];
  const isInterview = selected === 'interview';
  const inFuture = toLocalDateTime(date, time ?? '23:59').getTime() > now;

  const reset = () => {
    setSelected(null);
    setDate(toIsoDate(new Date()));
    setTime(null);
    setMode('onsite');
    setRemind(true);
    setNote('');
    setError(null);
  };

  const select = (status: Status) => {
    const next = status === selected ? null : status;
    setSelected(next);
    setError(null);
    // Ein Gespräch wird meist für einen der nächsten Tage vereinbart.
    if (next === 'interview' && date === toIsoDate(new Date()) && !upcomingInterview) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(toIsoDate(tomorrow));
    }
    if (next !== 'interview' && date > toIsoDate(new Date())) {
      setDate(toIsoDate(new Date()));
    }
  };

  const save = async () => {
    if (!selected) return;
    if (date < floorDate) {
      setError(`Das Datum liegt vor dem letzten Eintrag am ${formatDate(floorDate)}.`);
      return;
    }

    // Kommt etwas vor einem geplanten Gespräch dazwischen, fällt der Termin weg.
    let dropLaterInterviews = false;
    if (upcomingInterview && date < upcomingInterview.date) {
      const when = formatWeekdayDate(upcomingInterview.date);
      const ok = await confirm(
        isInterview ? 'Termin ersetzen?' : 'Geplanten Termin entfernen?',
        isInterview
          ? `Das geplante Gespräch am ${when} wird durch den neuen Termin ersetzt.`
          : `Das geplante Gespräch am ${when} wird samt Erinnerung entfernt.`,
        isInterview ? 'Ersetzen' : 'Entfernen',
      );
      if (!ok) return;
      dropLaterInterviews = true;
    }

    setSaving(true);
    try {
      await onSave(
        {
          status: selected,
          date,
          note: note.trim() || null,
          time: isInterview ? time : null,
          mode: isInterview ? mode : null,
        },
        { dropLaterInterviews, remind: isInterview && inFuture && remind },
      );
      reset();
    } catch (e) {
      console.error(e);
      setError('Der Status konnte nicht gespeichert werden. Bitte versuche es noch einmal.');
    } finally {
      setSaving(false);
    }
  };

  if (options.length === 0) {
    return (
      <View style={[styles.closed, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Text style={[styles.closedTitle, { color: theme.ink }]}>Bewerbung abgeschlossen</Text>
        <Text style={[styles.closedText, { color: theme.muted }]}>
          Nach „{STATUS_LABELS[current]}“ folgt kein weiterer Status. Falls sich doch noch
          etwas tut, entferne „{STATUS_LABELS[current]}“ unten im Verlauf.
        </Text>
      </View>
    );
  }

  const chipLabel = (status: Status) =>
    status === 'interview' && current === 'interview' ? 'Weiteres Gespräch' : STATUS_LABELS[status];

  const dateLabel =
    selected === 'applied' ? 'Wann abgeschickt?' : isInterview ? 'Wann?' : 'Seit wann?';

  return (
    <View style={styles.wrap}>
      {current === 'saved' && (
        <Text style={[styles.hint, { color: theme.muted }]}>
          Sobald du die Unterlagen abgeschickt hast, setz die Stelle auf „Beworben“. Erst dann
          zählt sie als Bewerbung und steht im Nachweis.
        </Text>
      )}
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Neuer Status">
        {options.map((status) => {
          const active = status === selected;
          const colors = theme.status[status];
          return (
            <Pressable
              key={status}
              onPress={() => select(status)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.bg, borderColor: colors.fg }
                  : { backgroundColor: theme.surface, borderColor: theme.line },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.fg : theme.ink, fontWeight: active ? '600' : '400' },
                ]}
              >
                {chipLabel(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Field label={dateLabel} error={error ?? undefined}>
            <DateField
              value={date}
              onChange={(iso) => {
                setDate(iso);
                setError(null);
              }}
              minimumDate={floorDate}
              direction={isInterview ? 'future' : 'past'}
              invalid={!!error}
              accessibilityLabel={`Datum für ${STATUS_LABELS[selected]}`}
            />
          </Field>

          {isInterview && (
            <>
              <Field label="Uhrzeit" optional>
                <TimeField value={time} onChange={setTime} accessibilityLabel="Uhrzeit des Gesprächs" />
              </Field>
              <Field label="Wie?">
                <ChoiceGroup
                  options={INTERVIEW_MODES}
                  labels={INTERVIEW_MODE_LABELS}
                  value={mode}
                  onChange={setMode}
                  accessibilityLabel="Art des Gesprächs"
                />
              </Field>
              {inFuture && (
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.switchLabel, { color: theme.ink }]}>Erinnern</Text>
                    <Text style={[styles.switchHint, { color: theme.muted }]}>
                      {time
                        ? 'Am Vorabend um 18 Uhr und eine Stunde vorher'
                        : 'Am Vorabend um 18 Uhr und morgens um 8 Uhr'}
                    </Text>
                  </View>
                  <Switch
                    value={remind}
                    onValueChange={setRemind}
                    trackColor={{ true: theme.accent, false: theme.line }}
                    thumbColor={theme.surface}
                    accessibilityLabel="An das Gespräch erinnern"
                  />
                </View>
              )}
            </>
          )}

          <Field label="Notiz" optional>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder={NOTE_PLACEHOLDER[selected] ?? 'Was ist passiert?'}
              multiline
              accessibilityLabel="Notiz zum Status"
            />
          </Field>

          <View style={styles.actions}>
            <Pressable onPress={reset} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
              <Text style={[styles.cancelText, { color: theme.muted }]}>Abbrechen</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.save,
                { backgroundColor: theme.accent, opacity: pressed || saving ? 0.85 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={theme.accentInk} />
              ) : (
                <Text style={[styles.saveText, { color: theme.accentInk }]}>
                  {isInterview && inFuture ? 'Termin speichern' : `„${STATUS_LABELS[selected]}“ speichern`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: type.body,
  hint: { ...type.small, lineHeight: 19 },
  panel: {
    padding: space.lg,
    gap: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  switchLabel: { ...type.body, fontWeight: '600' },
  switchHint: type.small,
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.lg },
  cancel: { paddingVertical: space.sm },
  cancelText: { ...type.body, fontWeight: '500' },
  save: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { ...type.body, fontWeight: '600' },
  closed: {
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  closedTitle: { ...type.body, fontWeight: '600' },
  closedText: { ...type.small, lineHeight: 19 },
});
