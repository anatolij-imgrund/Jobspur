import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listPhotoFileNames, orphanFileNames } from '@/db/photos';

/** Fotos liegen im privaten App-Ordner; andere Apps sehen sie nicht. */
const PHOTO_DIR = new Directory(Paths.document, 'fotos');

/** Längere Seite in Pixeln: Text auf einer Anzeige bleibt lesbar, die Datei klein. */
const MAX_EDGE = 2000;

export type PhotoSource = 'camera' | 'library';

export class CameraPermissionError extends Error {}

export function photoUri(fileName: string): string {
  return new File(PHOTO_DIR, fileName).uri;
}

function newFileName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

/**
 * Fotografieren oder aus der Galerie wählen. Gibt die gewählten Bilder als
 * vorläufige Adressen zurück, bei Abbruch eine leere Liste.
 */
export async function pickImages(source: PhotoSource): Promise<ImagePicker.ImagePickerAsset[]> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError();
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync({
          ...options,
          allowsMultipleSelection: true,
          selectionLimit: 10,
        });
  return result.canceled ? [] : result.assets;
}

/**
 * Verkleinert ein Bild und legt es als JPEG in den Foto-Ordner.
 *
 * Geschrieben wird über Base64 statt mit copy/move: In Expo Go darf die App
 * Dateien aus fremden Ordnern nicht immer lesen (siehe createPdf).
 */
export async function storeImage(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new Error('Bild ohne Inhalt');

  PHOTO_DIR.create({ intermediates: true, idempotent: true });
  const fileName = newFileName();
  const file = new File(PHOTO_DIR, fileName);
  file.create();
  file.write(saved.base64, { encoding: 'base64' });
  return fileName;
}

/** Löscht Fotodateien, die zu keiner Bewerbung mehr gehören. */
export async function removeOrphanPhotoFiles(db: SQLiteDatabase): Promise<void> {
  if (!PHOTO_DIR.exists) return;
  const onDisk = PHOTO_DIR.list()
    .filter((entry) => entry instanceof File)
    .map((f) => f.name);
  for (const name of orphanFileNames(onDisk, await listPhotoFileNames(db))) {
    try {
      new File(PHOTO_DIR, name).delete();
    } catch (e) {
      console.error(`Foto ${name} ließ sich nicht löschen:`, e);
    }
  }
}
