import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Backup } from './backup';
import { BackupError, backupFileName, LIMITS } from './backup';

export { folderLabel } from './backup';

function toJson(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** Ordner wählen lassen; null, wenn abgebrochen wurde. */
async function pickFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch {
    // Abbrechen meldet Android als Fehler.
    return null;
  }
}

function writeInto(folder: Directory, backup: Backup): void {
  // Gibt es die Datei von heute schon, vergibt Android selbst „(1)“ usw.
  const file = folder.createFile(backupFileName(), 'application/json');
  file.write(toJson(backup));
}

export type FolderSaveResult = { folderUri: string } | null;

/**
 * Speichert die Sicherung direkt in einen Ordner auf dem Handy, ohne
 * Internet. Beim ersten Mal wird der Ordner gewählt; Android merkt sich die
 * Erlaubnis, sodass es danach ohne Nachfrage geht.
 *
 * Ist der gemerkte Ordner nicht mehr erreichbar (gelöscht, Erlaubnis
 * entzogen), wird einmal neu gefragt. Gibt null zurück, wenn abgebrochen
 * wurde.
 */
export async function saveBackupToFolder(
  backup: Backup,
  rememberedUri: string | null,
  { chooseNew = false } = {},
): Promise<FolderSaveResult> {
  if (rememberedUri && !chooseNew) {
    try {
      writeInto(new Directory(rememberedUri), backup);
      return { folderUri: rememberedUri };
    } catch (error) {
      console.warn('Gemerkter Ordner nicht erreichbar, frage neu:', error);
    }
  }
  const folder = await pickFolder();
  if (!folder) return null;
  writeInto(folder, backup);
  return { folderUri: folder.uri };
}

/** Schreibt die Sicherung als Datei und öffnet den Teilen-Dialog. */
export async function shareBackup(backup: Backup): Promise<void> {
  const file = new File(Paths.cache, backupFileName());
  if (file.exists) file.delete();
  file.create();
  file.write(toJson(backup));

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
