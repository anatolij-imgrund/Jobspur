import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Backup } from './backup';
import { BackupError, backupFileName, LIMITS } from './backup';

/** Schreibt die Sicherung als Datei und öffnet den Teilen-Dialog. */
export async function shareBackup(backup: Backup): Promise<void> {
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Sicherung speichern',
  });
}

/**
 * Lässt eine Sicherungsdatei auswählen und gibt ihren Text zurück,
 * oder null, wenn abgebrochen wurde.
 */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Manche Dateimanager kennen .json nicht als application/json.
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const { uri, size } = result.assets[0];
  const tooBig = () =>
    new BackupError('Die Datei ist zu groß für eine Sicherung dieser App (höchstens 5 MB).');
  // Vor dem Lesen prüfen, damit eine riesige Datei gar nicht erst im Speicher landet.
  if (size !== undefined && size > LIMITS.fileBytes) throw tooBig();

  let text: string;
  try {
    text = await new File(uri).text();
  } catch {
    // In Expo Go darf die App nicht jeden Ordner direkt lesen; fetch klappt dort.
    const response = await fetch(uri);
    text = await response.text();
  }
  // Nicht jeder Dateimanager liefert eine Größe mit; deshalb hier noch einmal.
  if (text.length > LIMITS.fileBytes) throw tooBig();
  return text;
}
