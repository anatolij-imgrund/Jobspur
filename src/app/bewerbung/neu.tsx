import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { createApplication } from '@/db/applications';
import { ApplicationForm } from '@/features/application-form/ApplicationForm';
import { emptyFormValues, toNewApplication } from '@/features/application-form/schema';

export default function NeueBewerbungScreen() {
  const db = useSQLiteContext();
  // Einmal beim Öffnen festlegen, damit sich „heute“ beim Tippen nicht ändert.
  const [defaults] = useState(emptyFormValues);

  return (
    <ApplicationForm
      defaultValues={defaults}
      submitLabel="Bewerbung speichern"
      onSubmit={async (values) => {
        await createApplication(db, toNewApplication(values));
        router.back();
      }}
    />
  );
}
