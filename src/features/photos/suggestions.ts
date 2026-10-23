import type { JobInfo } from './extractJobInfo';

export type SuggestionKey = keyof JobInfo;

/** Felder, die die Texterkennung vorschlagen darf, in Reihenfolge des Formulars. */
export const SUGGESTION_FIELDS: readonly { key: SuggestionKey; label: string }[] = [
  { key: 'company', label: 'Firma' },
  { key: 'position', label: 'Stelle' },
  { key: 'location', label: 'Ort' },
  { key: 'contactName', label: 'Ansprechperson' },
  { key: 'contactEmail', label: 'E-Mail' },
  { key: 'jobUrl', label: 'Link' },
];

export type SuggestionRow = {
  key: SuggestionKey;
  label: string;
  value: string;
  /** Was jetzt im Feld steht und ersetzt würde; null, wenn es leer ist */
  replaces: string | null;
  /** Vorauswahl: leere Felder ja, schon ausgefüllte nein */
  checked: boolean;
};

/**
 * Was im Fenster „Auf dem Foto gefunden“ steht. Funde, die schon genau so
 * im Feld stehen, fehlen; was Getipptes überschreiben würde, ist nicht
 * vorausgewählt.
 */
export function suggestionRows(
  info: JobInfo,
  current: Readonly<Record<SuggestionKey, string>>,
): SuggestionRow[] {
  return SUGGESTION_FIELDS.flatMap(({ key, label }) => {
    const value = info[key]?.trim();
    if (!value) return [];
    const now = current[key].trim();
    if (now === value) return [];
    return [{ key, label, value, replaces: now || null, checked: now === '' }];
  });
}
