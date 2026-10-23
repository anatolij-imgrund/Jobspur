import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import type { SuggestionTarget } from '@/features/application-form/ApplicationForm';
import { background } from '@/lib/background';
import { type, useTheme } from '@/theme';

import { photoUri } from './photoFiles';
import { PhotoStrip } from './PhotoStrip';
import { recognizeJobInfo, textRecognitionAvailable } from './recognizeJobInfo';
import { type SuggestionKey, type SuggestionRow, suggestionRows } from './suggestions';
import { SuggestionSheet } from './SuggestionSheet';
import { usePhotoPicker } from './usePhotoPicker';

type Props = {
  /** Dateinamen der schon gespeicherten, aber noch nicht zugeordneten Fotos */
  photos: string[];
  onChange: (photos: string[]) => void;
  target: SuggestionTarget;
};

/**
 * Fotos beim Anlegen einer Bewerbung. In der eigenen App (nicht in Expo Go)
 * liest sie danach den Text und bietet Firma, Stelle, Ort und Kontakt zum
 * Übernehmen an.
 */
export function NewPhotosField({ photos, onChange, target }: Props) {
  const theme = useTheme();
  const [recognizing, setRecognizing] = useState(false);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const picker = usePhotoPicker(async (fileNames) => {
    onChange([...photos, ...fileNames]);
    if (!textRecognitionAvailable) return;
    setRecognizing(true);
    setNote(null);
    try {
      const found = suggestionRows(await recognizeJobInfo(fileNames), target.current());
      if (found.length > 0) setRows(found);
      else setNote('Auf dem Foto habe ich nichts Neues für die Felder gefunden.');
    } catch (e) {
      console.error(e);
      setNote('Den Text auf dem Foto konnte ich nicht lesen. Das Foto ist trotzdem dabei.');
    } finally {
      setRecognizing(false);
    }
  });

  const done = (keys: SuggestionKey[]) => {
    const chosen = rows.filter((r) => keys.includes(r.key));
    target.apply(Object.fromEntries(chosen.map((r) => [r.key, r.value])));
    setRows([]);
    setNote(
      chosen.length > 0
        ? `Übernommen: ${chosen.map((r) => r.label).join(', ')}. Korrigieren kannst du jederzeit.`
        : null,
    );
  };

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
      {rows.length > 0 && (
        // Neuer key bei neuen Funden: Häkchen starten wieder bei der Vorauswahl.
        <SuggestionSheet key={rows.map((r) => r.key + r.value).join('|')} rows={rows} onDone={done} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  note: { ...type.small, lineHeight: 19 },
});
