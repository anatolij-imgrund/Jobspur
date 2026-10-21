import { useState } from 'react';

/**
 * Zeitpunkt, zu dem die Komponente erschienen ist.
 *
 * `Date.now()` direkt beim Rendern liefert bei jedem Durchlauf etwas anderes;
 * der React Compiler verbietet das zu Recht. Für „liegt der Termin in der
 * Zukunft?“ reicht der Moment, in dem der Bildschirm geöffnet wurde.
 */
export function useNow(): number {
  const [now] = useState(Date.now);
  return now;
}
