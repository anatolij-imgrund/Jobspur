import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { createRecipient } from '@/db/recipients';
import { RecipientForm } from '@/features/settings/RecipientForm';
import { emptyRecipientValues, toNewRecipient } from '@/features/settings/schemas';

export default function NeuerEmpfaengerScreen() {
  const db = useSQLiteContext();
  const [defaults] = useState(emptyRecipientValues);

  return (
    <RecipientForm
      defaultValues={defaults}
      submitLabel="Stelle speichern"
      onSubmit={async (values) => {
        await createRecipient(db, toNewRecipient(values));
        router.back();
      }}
    />
  );
}
