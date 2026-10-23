import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { background } from '@/lib/background';
import { type, useTheme } from '@/theme';

import type { JobInfo } from './extractJobInfo';
import { photoUri } from './photoFiles';
import { PhotoStrip } from './PhotoStrip';
import { recognizeJobInfo, textRecognitionAvailable } from './recognizeJobInfo';
import { usePhotoPicker } from './usePhotoPicker';

type Props = {
  /** Dateinamen der schon gespeicherten, aber noch nicht zugeordneten Fotos */
  photos: string[];
  onChange: (photos: string[]) => void;
  /** Trägt Vorschläge in leere Felder ein, gibt deren Namen zurück */
  applySuggestion: (info: JobInfo) => string[];
};

/**
 * Fotos beim Anlegen einer Bewerbung. In der eigenen App (nicht in Expo Go)
 * liest sie danach den Text und schlägt Firma, Stelle, Ort und Kontakt vor.
 */
export function NewPhotosField({ photos, onChange, applySuggestion }: Props) {
  const theme = useTheme();
  const [recognizing, setRecognizing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const picker = usePhotoPicker(async (fileNames) => {
    onChange([...photos, ...fileNames]);
    if (!textRecognitionAvailable) return;
    setRecognizing(true);
    try {
      const filled = applySuggestion(await recognizeJobInfo(fileNames));
      setNote(
        filled.length > 0
          ? `Aus dem Foto übernommen: ${filled.join(', ')}. Bitte kurz prüfen.`
          : 'Auf dem Foto habe ich nichts gefunden, was in die leeren Felder passt.',
      );
    } catch (e) {
      console.error(e);
      setNote('Den Text auf dem Foto konnte ich nicht lesen. Das Foto ist trotzdem dabei.');
    } finally {
      setRecognizing(false);
    }
  });

  return (
    <>
      <PhotoStrip
        photos={photos.map((name) => ({ key: name, uri: photoUri(name) }))}
        busy={picker.busy || recognizing}
        onAdd={(source) => background(picker.add(source), 'Hinzufügen eines Fotos')}
        onRemove={(name) => onChange(photos.filter((p) => p !== name))}
      />
      {(recognizing || note) && (
        <Text style={[styles.note, { color: theme.muted }]}>
          {recognizing ? 'Text auf dem Foto wird gelesen …' : note}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  note: { ...type.small, lineHeight: 19 },
});
