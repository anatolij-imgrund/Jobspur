import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { createApplication } from '@/db/applications';
import { addPhotos } from '@/db/photos';
import { ApplicationForm } from '@/features/application-form/ApplicationForm';
import { emptyFormValues, toNewApplication } from '@/features/application-form/schema';
import { NewPhotosField } from '@/features/photos/NewPhotosField';

export default function NeueBewerbungScreen() {
  const db = useSQLiteContext();
  // Einmal beim Öffnen festlegen, damit sich „heute“ beim Tippen nicht ändert.
  const [defaults] = useState(emptyFormValues);
  // Schon im Foto-Ordner, aber noch ohne Bewerbung. Wird das Formular
  // verworfen, räumt die App die Dateien beim nächsten Start weg.
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <ApplicationForm
      defaultValues={defaults}
      chooseStage
      extraDirty={photos.length > 0}
      renderPhotos={(target) => (
        <NewPhotosField photos={photos} onChange={setPhotos} target={target} />
      )}
      submitLabel="Bewerbung speichern"
      onSubmit={async (values) => {
        const id = await createApplication(db, toNewApplication(values), values.stage);
        if (photos.length > 0) await addPhotos(db, id, photos);
        router.back();
      }}
    />
  );
}
