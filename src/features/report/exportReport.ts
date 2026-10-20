import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { A4 } from './renderReport';

/**
 * Erzeugt aus dem HTML ein A4-PDF mit lesbarem Dateinamen.
 *
 * expo-print legt die Datei mit zufälligem Namen in einem Ordner ab, auf den
 * die App in Expo Go keinen Lesezugriff hat. Verschieben scheitert dort deshalb.
 * Stattdessen holen wir den Inhalt als Base64 und schreiben ihn selbst in den
 * eigenen Cache, dann heißt die Datei beim Teilen „Nachweis_…pdf“.
 */
export async function createPdf(html: string, fileName: string): Promise<string> {
  const result = await Print.printToFileAsync({
    html,
    width: A4.width,
    height: A4.height,
    base64: true,
  });

  if (!result.base64) {
    // Sollte nicht vorkommen; dann eben mit dem zufälligen Namen teilen.
    return result.uri;
  }

  const target = new File(Paths.cache, fileName);
  if (target.exists) target.delete();
  target.create();
  target.write(result.base64, { encoding: 'base64' });

  // Die Zwischendatei aufräumen, soweit wir dürfen. In Expo Go geht das nicht,
  // dort räumt das System den Cache später selbst auf.
  try {
    new File(result.uri).delete();
  } catch {
    // bewusst ignoriert
  }

  return target.uri;
}

/** Öffnet den Teilen-Dialog von Android (E-Mail, Messenger, Drive, …). */
export async function sharePdf(uri: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  });
}

/** Systemdialog zum Drucken; zeigt eine Vorschau und kann auch als PDF speichern. */
export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html, width: A4.width, height: A4.height });
}
