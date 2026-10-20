import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';

type Props = {
  /** ISO-Datum "YYYY-MM-DD" */
  value: string;
  onChange: (iso: string) => void;
  invalid?: boolean;
  /** Frühestes wählbares Datum (ISO); spätestes ist immer heute. */
  minimumDate?: string;
  accessibilityLabel?: string;
};

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  // 12 Uhr mittags, damit Zeitzonen den Tag nicht verschieben.
  return new Date(y, m - 1, d, 12);
}

function relativeLabel(iso: string): string | null {
  const today = new Date();
  if (iso === toIsoDate(today)) return 'heute';
  today.setDate(today.getDate() - 1);
  if (iso === toIsoDate(today)) return 'gestern';
  return null;
}

/** Datumsfeld mit Schnellwahl „Heute“ und „Gestern“ und Kalender. */
export function DateField({
  value,
  onChange,
  invalid,
  minimumDate,
  accessibilityLabel = 'Datum',
}: Props) {
  const theme = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const relative = relativeLabel(value);
  const minDate = minimumDate ? parseIso(minimumDate) : undefined;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseIso(value),
        mode: 'date',
        maximumDate: new Date(),
        minimumDate: minDate,
        firstDayOfWeek: 1,
        onValueChange: (_event, date) => onChange(toIsoDate(date)),
      });
    } else {
      setIosOpen((open) => !open);
    }
  };

  const shortcut = (label: string, daysBack: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const iso = toIsoDate(d);
    const selected = iso === value;
    // ISO-Daten lassen sich als Text vergleichen.
    const disabled = minimumDate !== undefined && iso < minimumDate;
    return (
      <Pressable
        onPress={() => onChange(iso)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        style={[
          styles.shortcut,
          selected
            ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
            : { borderColor: theme.line },
          disabled && { opacity: 0.4 },
        ]}
      >
        <Text style={[styles.shortcutText, { color: selected ? theme.accent : theme.ink }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel}: ${formatDate(value)}. Antippen zum Ändern`}
          style={[
            styles.dateButton,
            {
              backgroundColor: theme.surface,
              borderColor: invalid ? theme.danger : theme.line,
            },
          ]}
        >
          <Text style={[styles.dateText, { color: theme.ink }]}>{formatDate(value)}</Text>
          {relative && <Text style={[styles.relative, { color: theme.muted }]}>{relative}</Text>}
        </Pressable>
        {shortcut('Heute', 0)}
        {shortcut('Gestern', 1)}
      </View>

      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={parseIso(value)}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          minimumDate={minDate}
          accentColor={theme.accent}
          onValueChange={(_event, date) => onChange(toIsoDate(date))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
  dateButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dateText: { ...type.body, fontWeight: '600' },
  relative: type.small,
  shortcut: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  shortcutText: { ...type.small, fontWeight: '500' },
});
