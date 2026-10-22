import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { createApplication } from '@/db/applications';
import { addPhotos } from '@/db/photos';
import { ApplicationForm } from '@/features/application-form/ApplicationForm';
import { emptyFormValues, toNewApplication } from '@/features/application-form/schema';
import { photoUri } from '@/features/photos/photoFiles';
import { PhotoStrip } from '@/features/photos/PhotoStrip';
import { usePhotoPicker } from '@/features/photos/usePhotoPicker';
import { background } from '@/lib/background';

export default function NeueBewerbungScreen() {
  const db = useSQLiteContext();
  // Einmal beim Öffnen festlegen, damit sich „heute“ beim Tippen nicht ändert.
  const [defaults] = useState(emptyFormValues);
  // Schon im Foto-Ordner, aber noch ohne Bewerbung. Wird das Formular
  // verworfen, räumt die App die Dateien beim nächsten Start weg.
  const [photos, setPhotos] = useState<string[]>([]);
  const picker = usePhotoPicker((fileNames) => setPhotos((prev) => [...prev, ...fileNames]));

  return (
    <ApplicationForm
      defaultValues={defaults}
      chooseStage
      extraDirty={photos.length > 0}
      photos={
        <PhotoStrip
          photos={photos.map((name) => ({ key: name, uri: photoUri(name) }))}
          busy={picker.busy}
          onAdd={(source) => background(picker.add(source), 'Hinzufügen eines Fotos')}
          onRemove={(name) => setPhotos((prev) => prev.filter((p) => p !== name))}
        />
      }
      submitLabel="Bewerbung speichern"
      onSubmit={async (values) => {
        const id = await createApplication(db, toNewApplication(values), values.stage);
        if (photos.length > 0) await addPhotos(db, id, photos);
        router.back();
      }}
    />
  );
}
