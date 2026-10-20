import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { Placeholder } from '@/components/Placeholder';
import { getApplication } from '@/db/applications';
import type { Application } from '@/types/application';

export default function BewerbungDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    getApplication(db, Number(id)).then(setApplication);
  }, [db, id]);

  return (
    <>
      <Stack.Screen options={{ title: application?.company ?? 'Bewerbung' }} />
      <Placeholder
        title={application ? application.position : 'Wird geladen'}
        text="Statusverlauf, Status ändern und Bearbeiten folgen im nächsten Schritt."
      />
    </>
  );
}
