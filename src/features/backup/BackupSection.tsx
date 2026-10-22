import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { removeOrphanPhotoFiles } from '@/features/photos/photoFiles';
import { cancelReminders } from '@/features/reminders/reminders';
import { rescheduleUpcomingReminders } from '@/features/reminders/reschedule';
import { background } from '@/lib/background';
import { daysSince, formatDate, formatDaysAgo, toIsoDate } from '@/lib/dates';
import { radius, space, type, useTheme } from '@/theme';

import {
  BackupError,
  buildBackup,
  describeBackup,
  getBackupFolderUri,
  getLastBackupAt,
  parseBackup,
  restoreBackup,
  setBackupFolderUri,
  setLastBackupAt,
} from './backup';
import { folderLabel, pickBackupText, saveBackupToFolder, shareBackup } from './backupFile';

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
  const [folderUri, setFolderUri] = useState<string | null>(null);
  const [busy, setBusy] = useState<'folder' | 'share' | 'import' | null>(null);

  useFocusEffect(
    useCallback(() => {
      background(getLastBackupAt(db).then(setLast), 'Laden der letzten Sicherung');
      background(getBackupFolderUri(db).then(setFolderUri), 'Laden des Sicherungsordners');
    }, [db]),
  );

  const markSaved = async () => {
    const today = toIsoDate(new Date());
    await setLastBackupAt(db, today);
    setLast(today);
  };

  /** Ohne Internet: direkt in einen Ordner auf dem Handy. */
  const saveToFolder = async (chooseNew = false) => {
    setBusy('folder');
    try {
      const result = await saveBackupToFolder(await buildBackup(db), folderUri, { chooseNew });
      if (!result) return; // abgebrochen
      if (result.folderUri !== folderUri) {
        await setBackupFolderUri(db, result.folderUri);
        setFolderUri(result.folderUri);
      }
      await markSaved();
      Alert.alert('Gespeichert', `Die Sicherung liegt im Ordner „${folderLabel(result.folderUri)}“.`);
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Sicherung fehlgeschlagen',
        'Die Datei konnte nicht in den Ordner geschrieben werden. Wähle über „Ordner ändern“ einen anderen.',
      );
    } finally {
      setBusy(null);
    }
  };

  /** Über den Teilen-Dialog: Google Drive, E-Mail, Messenger … */
  const share = async () => {
    setBusy('share');
    try {
      await shareBackup(await buildBackup(db));
      // Ob im Teilen-Dialog wirklich gespeichert wurde, erfährt die App nicht.
      // Wer den Dialog öffnet, hat aber in aller Regel gesichert.
      await markSaved();
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
        `${describeBackup(backup)}\n\nAlle Daten, die jetzt in der App sind, werden dabei ersetzt. Fotos sind nicht in der Sicherung und werden dabei gelöscht.`,
        'Wiederherstellen',
      );
      if (!ok) return;

      const oldReminders = await restoreBackup(db, backup);
      await cancelReminders(oldReminders);
      const rescheduled = await rescheduleUpcomingReminders(db);
      background(removeOrphanPhotoFiles(db), 'Aufräumen der Fotos');
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
        Deine Daten liegen nur auf diesem Handy. Speichere ab und zu eine Sicherung, am besten
        zusätzlich außerhalb des Handys, z. B. in Google Drive. Dann sind deine Daten auch bei
        einem neuen Handy da. Fotos sind nicht in der Sicherung.
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
        onPress={() => saveToFolder()}
        disabled={busy !== null}
        accessibilityRole="button"
        accessibilityHint="Speichert ohne Internet in einen Ordner auf dem Handy"
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: theme.accent, opacity: pressed || busy ? 0.75 : 1 },
        ]}
      >
        {busy === 'folder' ? (
          <ActivityIndicator color={theme.accentInk} />
        ) : (
          <View style={styles.buttonText}>
            <Text style={[styles.primaryText, { color: theme.accentInk }]}>Auf dem Handy speichern</Text>
            <Text style={[styles.primaryHint, { color: theme.accentInk }]}>
              {folderUri ? `im Ordner „${folderLabel(folderUri)}“` : 'Ordner beim ersten Mal wählen'}
            </Text>
          </View>
        )}
      </Pressable>
      {folderUri && (
        <Pressable
          onPress={() => saveToFolder(true)}
          disabled={busy !== null}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.link}
        >
          <Text style={[styles.linkText, { color: theme.accent }]}>Ordner ändern</Text>
        </Pressable>
      )}

      <Pressable
        onPress={share}
        disabled={busy !== null}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: theme.line, opacity: pressed || busy ? 0.75 : 1 },
        ]}
      >
        {busy === 'share' ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Text style={[styles.secondaryText, { color: theme.accent }]}>
            Teilen: Drive, E-Mail …
          </Text>
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
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.body, fontWeight: '600' },
  primaryHint: { ...type.small, opacity: 0.85 },
  buttonText: { alignItems: 'center', paddingVertical: space.sm },
  link: { alignSelf: 'center', marginTop: -space.xs },
  linkText: { ...type.small, fontWeight: '600' },
  secondary: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...type.body, fontWeight: '600' },
});
