import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { A4 } from './renderReport';

/**
 * Erzeugt aus dem HTML ein A4-PDF und gibt ihm einen lesbaren Namen.
 * expo-print legt die Datei mit zufälligem Namen im Cache ab; wer sie
 * per E-Mail verschickt, soll aber „Nachweis_…pdf“ sehen.
 */
export async function createPdf(html: string, fileName: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, width: A4.width, height: A4.height });
  const generated = new File(uri);
  const target = new File(Paths.cache, fileName);
  generated.move(target, { overwrite: true });
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
