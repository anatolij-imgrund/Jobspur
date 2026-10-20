import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField } from '@/components/form/DateField';
import { Field } from '@/components/form/Field';
import { TextField } from '@/components/form/TextField';
import { formatDate, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';
import { NEXT_STATUSES, STATUS_LABELS, type Status } from '@/types/application';

type Props = {
  current: Status;
  /** Datum des aktuellen Status: Ein neuer kann nicht davor liegen. */
  currentSince: string;
  onSave: (event: { status: Status; date: string; note: string | null }) => Promise<void>;
};

const NOTE_PLACEHOLDER: Partial<Record<Status, string>> = {
  interview: 'z. B. Termin per Video, Gespräch mit Frau Berger',
  rejected: 'z. B. Absage per E-Mail, Begründung',
  offer: 'z. B. Start zum 1. Dezember',
};

/**
 * Status wählen, dann klappt darunter Datum und Notiz auf.
 * Erst „Status speichern“ schreibt den Eintrag in den Verlauf.
 */
export function StatusChanger({ current, currentSince, onSave }: Props) {
  const theme = useTheme();
  const [selected, setSelected] = useState<Status | null>(null);
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = NEXT_STATUSES[current];

  const reset = () => {
    setSelected(null);
    setDate(toIsoDate(new Date()));
    setNote('');
    setError(null);
  };

  const save = async () => {
    if (!selected) return;
    if (date < currentSince) {
      setError(
        `Das Datum liegt vor „${STATUS_LABELS[current]}“ am ${formatDate(currentSince)}.`,
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({ status: selected, date, note: note.trim() || null });
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

  return (
    <View style={styles.wrap}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Neuer Status">
        {options.map((status) => {
          const active = status === selected;
          const colors = theme.status[status];
          return (
            <Pressable
              key={status}
              onPress={() => {
                setSelected(active ? null : status);
                setError(null);
              }}
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
                {STATUS_LABELS[status]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Field label="Seit wann?" error={error ?? undefined}>
            <DateField
              value={date}
              onChange={(iso) => {
                setDate(iso);
                setError(null);
              }}
              minimumDate={currentSince}
              invalid={!!error}
              accessibilityLabel={`Datum für ${STATUS_LABELS[selected]}`}
            />
          </Field>
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
                  „{STATUS_LABELS[selected]}“ speichern
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
  panel: {
    padding: space.lg,
    gap: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
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
