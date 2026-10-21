import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { cancelReminders } from '@/features/reminders/reminders';
import { rescheduleUpcomingReminders } from '@/features/reminders/reschedule';
import { daysSince, formatDate, formatDaysAgo, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';

import {
  BackupError,
  buildBackup,
  describeBackup,
  getLastBackupAt,
  parseBackup,
  restoreBackup,
  setLastBackupAt,
} from './backup';
import { pickBackupText, shareBackup } from './backupFile';

/** Ab so vielen Tagen ohne Sicherung gibt es einen sanften Hinweis. */
const REMIND_AFTER_DAYS = 30;

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
        { text: ok, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}

export function BackupSection({ onRestored }: { onRestored: () => void }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [lastBackupAt, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLastBackupAt(db).then(setLast);
    }, [db]),
  );

  const exportBackup = async () => {
    setBusy('export');
    try {
      await shareBackup(await buildBackup(db));
      // Ob im Teilen-Dialog wirklich gespeichert wurde, erfährt die App nicht.
      // Wer den Dialog öffnet, hat aber in aller Regel gesichert.
      const today = toIsoDate(new Date());
      await setLastBackupAt(db, today);
      setLast(today);
    } catch (e) {
      console.error(e);
      Alert.alert('Sicherung fehlgeschlagen', 'Die Datei konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  };

  const importBackup = async () => {
    setBusy('import');
    try {
      const text = await pickBackupText();
      if (text === null) return;

      const backup = parseBackup(text);
      const ok = await confirm(
        'Sicherung wiederherstellen?',
        `${describeBackup(backup)}\n\nAlle Daten, die jetzt in der App sind, werden dabei ersetzt.`,
        'Wiederherstellen',
      );
      if (!ok) return;

      const oldReminders = await restoreBackup(db, backup);
      await cancelReminders(oldReminders);
      const rescheduled = await rescheduleUpcomingReminders(db);
      onRestored();

      Alert.alert(
        'Wiederhergestellt',
        rescheduled > 0
          ? `Deine Daten sind zurück. Für ${rescheduled} ${rescheduled === 1 ? 'kommendes Gespräch ist die Erinnerung' : 'kommende Gespräche sind die Erinnerungen'} wieder eingerichtet.`
          : 'Deine Daten sind zurück.',
      );
    } catch (e) {
      if (e instanceof BackupError) {
        Alert.alert('Diese Datei passt nicht', e.message);
      } else {
        console.error(e);
        Alert.alert(
          'Wiederherstellen fehlgeschlagen',
          'Es wurde nichts geändert. Deine bisherigen Daten sind unverändert.',
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const days = lastBackupAt ? daysSince(lastBackupAt) : null;
  const overdue = days === null || days >= REMIND_AFTER_DAYS;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.ink }]}>Datensicherung</Text>
      <Text style={[styles.intro, { color: theme.muted }]}>
        Deine Daten liegen nur auf diesem Handy. Speichere ab und zu eine Sicherung in Google
        Drive oder schick sie dir per E-Mail, dann sind sie auch bei einem neuen Handy da.
      </Text>

      <Text
        style={[
          styles.last,
          { color: overdue ? theme.status.interview.fg : theme.muted },
          overdue && { fontWeight: '600' },
        ]}
      >
        {lastBackupAt
          ? `Zuletzt gesichert am ${formatDate(lastBackupAt)}, ${formatDaysAgo(days ?? 0)}`
          : 'Noch keine Sicherung erstellt'}
      </Text>

      <Pressable
        onPress={exportBackup}
        disabled={busy !== null}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: theme.accent, opacity: pressed || busy ? 0.75 : 1 },
        ]}
      >
        {busy === 'export' ? (
          <ActivityIndicator color={theme.accentInk} />
        ) : (
          <Text style={[styles.primaryText, { color: theme.accentInk }]}>Sicherung erstellen</Text>
        )}
      </Pressable>

      <Pressable
        onPress={importBackup}
        disabled={busy !== null}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: theme.line, opacity: pressed || busy ? 0.75 : 1 },
        ]}
      >
        {busy === 'import' ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={[styles.secondaryText, { color: theme.accent }]}>
            Sicherung wiederherstellen
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  title: type.heading,
  intro: { ...type.small, lineHeight: 19, marginTop: -space.xs },
  last: type.small,
  primary: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.body, fontWeight: '600' },
  secondary: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...type.body, fontWeight: '600' },
});
