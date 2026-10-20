import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { deleteRecipient, getRecipient, updateRecipient } from '@/db/recipients';
import { RecipientForm } from '@/features/settings/RecipientForm';
import {
  type RecipientFormValues,
  toNewRecipient,
  toRecipientValues,
} from '@/features/settings/schemas';
import { space, type, useTheme } from '@/theme';

type Loaded =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'ready'; values: RecipientFormValues; name: string };

export default function EmpfaengerBearbeitenScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const theme = useTheme();
  const [data, setData] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    getRecipient(db, id).then((r) =>
      setData(r ? { state: 'ready', values: toRecipientValues(r), name: r.name } : { state: 'missing' }),
    );
  }, [db, id]);

  if (data.state === 'loading') return null;
  if (data.state === 'missing') {
    return <Placeholder title="Diese Stelle gibt es nicht mehr" text="Sie wurde vermutlich gelöscht." />;
  }

  const confirmDelete = () => {
    Alert.alert(
      'Stelle löschen?',
      `„${data.name}“ wird aus deinen Empfängern entfernt. Deine Bewerbungen bleiben erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipient(db, id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <RecipientForm
      defaultValues={data.values}
      submitLabel="Änderungen speichern"
      onSubmit={async (values) => {
        await updateRecipient(db, id, toNewRecipient(values));
        router.back();
      }}
      footerExtra={
        <Pressable onPress={confirmDelete} accessibilityRole="button" style={styles.delete}>
          <Text style={[styles.deleteText, { color: theme.danger }]}>Stelle löschen</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  delete: { alignSelf: 'flex-start', paddingVertical: space.sm },
  deleteText: { ...type.body, fontWeight: '500' },
});
