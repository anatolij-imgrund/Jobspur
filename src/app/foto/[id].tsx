import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { deletePhoto, getPhoto, type Photo } from '@/db/photos';
import { photoUri, removeOrphanPhotoFiles } from '@/features/photos/photoFiles';
import { background } from '@/lib/background';
import { type, useTheme } from '@/theme';

type Loaded = { state: 'loading' } | { state: 'missing' } | { state: 'ready'; photo: Photo };

/** Ein Foto bildschirmfüllend, mit Löschen oben rechts. */
export default function FotoScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const db = useSQLiteContext();
  const theme = useTheme();
  const [data, setData] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    const load = async () => {
      const photo = await getPhoto(db, id);
      setData(photo ? { state: 'ready', photo } : { state: 'missing' });
    };
    background(load(), 'Laden des Fotos');
  }, [db, id]);

  const confirmDelete = () => {
    Alert.alert('Foto löschen?', 'Das Foto wird vom Handy entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deletePhoto(db, id);
          background(removeOrphanPhotoFiles(db), 'Aufräumen der Fotos');
          router.back();
        },
      },
    ]);
  };

  if (data.state === 'loading') return <Stack.Screen options={{ title: 'Foto' }} />;
  if (data.state === 'missing') {
    return (
      <>
        <Stack.Screen options={{ title: 'Foto' }} />
        <Placeholder title="Dieses Foto gibt es nicht mehr" text="Es wurde vermutlich gelöscht." />
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Foto',
          headerRight: () => (
            <Pressable onPress={confirmDelete} accessibilityRole="button" hitSlop={12}>
              <Text style={[styles.action, { color: theme.danger }]}>Löschen</Text>
            </Pressable>
          ),
        }}
      />
      <Image
        source={{ uri: photoUri(data.photo.fileName) }}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="Foto zur Bewerbung"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  image: { flex: 1 },
  action: { ...type.body, fontWeight: '600' },
});
