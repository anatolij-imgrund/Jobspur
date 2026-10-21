import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getProfile, saveProfile } from '@/db/settings';
import { ProfileForm } from '@/features/settings/ProfileForm';
import { type ProfileFormValues, toProfile } from '@/features/settings/schemas';
import { background } from '@/lib/background';

export default function ProfilScreen() {
  const db = useSQLiteContext();
  const [values, setValues] = useState<ProfileFormValues | null>(null);

  useEffect(() => {
    background(getProfile(db).then(setValues), 'Laden deiner Angaben');
  }, [db]);

  if (!values) return null;

  return (
    <ProfileForm
      defaultValues={values}
      onSubmit={async (next) => {
        await saveProfile(db, toProfile(next));
        router.back();
      }}
    />
  );
}
