import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { radius, space, type, useTheme } from '@/theme';

import type { PhotoSource } from './photoFiles';

export type StripPhoto = { key: string; uri: string };

type Props = {
  photos: StripPhoto[];
  onAdd: (source: PhotoSource) => void;
  /** Antippen eines Fotos (z. B. groß ansehen) */
  onOpen?: (key: string) => void;
  /** Wenn gesetzt, hat jedes Foto ein × zum Entfernen */
  onRemove?: (key: string) => void;
  busy?: boolean;
};

const SIZE = 88;

/** Waagerechte Reihe: Vorschaubilder, dahinter Kamera und Galerie. */
export function PhotoStrip({ photos, onAdd, onOpen, onRemove, busy = false }: Props) {
  const theme = useTheme();

  const addTile = (source: PhotoSource, icon: IconName, label: string) => (
    <Pressable
      onPress={() => onAdd(source)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        styles.addTile,
        { borderColor: theme.line },
        pressed && { backgroundColor: theme.accentSoft },
      ]}
    >
      <Icon name={icon} size={24} color={theme.accent} />
      <Text style={[styles.addText, { color: theme.accent }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {photos.map((photo, index) => (
        <View key={photo.key}>
          <Pressable
            onPress={onOpen ? () => onOpen(photo.key) : undefined}
            disabled={!onOpen}
            accessibilityRole={onOpen ? 'imagebutton' : 'image'}
            accessibilityLabel={`Foto ${index + 1}${onOpen ? ' groß ansehen' : ''}`}
          >
            <Image
              source={{ uri: photo.uri }}
              style={[styles.tile, { backgroundColor: theme.line }]}
              contentFit="cover"
              transition={150}
            />
          </Pressable>
          {onRemove && (
            <Pressable
              onPress={() => onRemove(photo.key)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Foto ${index + 1} entfernen`}
              style={[styles.remove, { backgroundColor: theme.ink }]}
            >
              <Icon name="close" size={14} color={theme.background} />
            </Pressable>
          )}
        </View>
      ))}
      {busy ? (
        <View style={[styles.tile, styles.addTile, { borderColor: theme.line }]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <>
          {addTile('camera', 'camera', 'Foto')}
          {addTile('library', 'gallery', 'Galerie')}
        </>
      )}
      {/* Android ignoriert paddingRight in waagerechten Listen */}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Oben Platz für das × an den Vorschaubildern
  row: { gap: space.sm, paddingTop: space.sm },
  tile: { width: SIZE, height: SIZE, borderRadius: radius.md },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { ...type.small, fontWeight: '600' },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSpacer: { width: space.xs },
});
