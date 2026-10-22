import { useState } from 'react';
import { Alert } from 'react-native';

import { CameraPermissionError, type PhotoSource, pickImages, storeImage } from './photoFiles';

/**
 * Fotografieren oder aus der Galerie wählen, verkleinern, speichern.
 * `onStored` bekommt die Dateinamen der gespeicherten Bilder.
 */
export function usePhotoPicker(onStored: (fileNames: string[]) => Promise<void> | void) {
  const [busy, setBusy] = useState(false);

  const add = async (source: PhotoSource) => {
    try {
      const assets = await pickImages(source);
      if (assets.length === 0) return;
      setBusy(true);
      const fileNames: string[] = [];
      for (const asset of assets) fileNames.push(await storeImage(asset));
      await onStored(fileNames);
    } catch (e) {
      if (e instanceof CameraPermissionError) {
        Alert.alert(
          'Kein Zugriff auf die Kamera',
          'Erlaube Jobspur die Kamera in den Android-Einstellungen unter Apps, oder wähle ein Foto aus der Galerie.',
        );
      } else {
        console.error(e);
        Alert.alert('Foto nicht gespeichert', 'Das Bild ließ sich nicht übernehmen. Bitte versuche es noch einmal.');
      }
    } finally {
      setBusy(false);
    }
  };

  return { add, busy };
}
