import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Backup } from './backup';
import { backupFileName } from './backup';

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

  const { uri } = result.assets[0];
  try {
    return await new File(uri).text();
  } catch {
    // In Expo Go darf die App nicht jeden Ordner direkt lesen; fetch klappt dort.
    const response = await fetch(uri);
    return await response.text();
  }
}
