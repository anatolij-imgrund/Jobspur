import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { toTimeString } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';

import { Icon } from '../Icon';

type Props = {
  /** "HH:MM" oder null, wenn noch keine Uhrzeit gewählt ist */
  value: string | null;
  onChange: (time: string | null) => void;
  accessibilityLabel?: string;
};

function toDate(time: string | null): Date {
  const d = new Date();
  const [h, m] = (time ?? '10:00').split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Uhrzeit im 24-Stunden-Format, mit Knopf zum Leeren. */
export function TimeField({ value, onChange, accessibilityLabel = 'Uhrzeit' }: Props) {
  const theme = useTheme();
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => onChange(toTimeString(date)),
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityLabel}: ${value ? `${value} Uhr` : 'keine'}. Antippen zum Ändern`}
          style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <Text
            style={[
              styles.text,
              value ? { color: theme.ink, fontWeight: '600' } : { color: theme.muted },
            ]}
          >
            {value ? `${value} Uhr` : 'Uhrzeit wählen'}
          </Text>
        </Pressable>
        {value && (
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel="Uhrzeit entfernen"
            hitSlop={8}
            style={[styles.clear, { borderColor: theme.line }]}
          >
            <Icon name="close" size={18} color={theme.muted} />
          </Pressable>
        )}
      </View>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="spinner"
          is24Hour
          onValueChange={(_event, date) => onChange(toTimeString(date))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  button: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: type.body,
  clear: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
