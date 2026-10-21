import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { Placeholder } from '@/components/Placeholder';
import {
  getApplication,
  getEarliestFollowUpDate,
  updateApplication,
} from '@/db/applications';
import { ApplicationForm } from '@/features/application-form/ApplicationForm';
import {
  type ApplicationFormValues,
  toFormValues,
  toNewApplication,
} from '@/features/application-form/schema';
import { background } from '@/lib/background';

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'ready'; values: ApplicationFormValues; latestAppliedAt: string | null };

export default function BewerbungBearbeitenScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const [data, setData] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    const load = async () => {
      const app = await getApplication(db, id);
      if (!app) {
        setData({ state: 'missing' });
        return;
      }
      const latestAppliedAt = await getEarliestFollowUpDate(db, id);
      setData({ state: 'ready', values: toFormValues(app), latestAppliedAt });
    };
    background(load(), 'Laden der Bewerbung');
  }, [db, id]);

  if (data.state === 'loading') return null;
  if (data.state === 'missing') {
    return (
      <Placeholder
        title="Diese Bewerbung gibt es nicht mehr"
        text="Sie wurde vermutlich gelöscht."
      />
    );
  }

  return (
    <ApplicationForm
      defaultValues={data.values}
      latestAppliedAt={data.latestAppliedAt}
      submitLabel="Änderungen speichern"
      onSubmit={async (values) => {
        await updateApplication(db, id, toNewApplication(values));
        router.back();
      }}
    />
  );
}
