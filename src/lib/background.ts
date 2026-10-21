/**
 * Startet eine Aufgabe, auf deren Ende niemand wartet (z. B. Daten laden,
 * wenn ein Bildschirm sichtbar wird), ohne dass ein Fehler still verschwindet.
 *
 * Ein bloßes `load()` ohne `await` würde einen Fehler verschlucken; ESLint
 * meldet das deshalb (no-floating-promises). Hier landet er wenigstens im Log.
 */
export function background(task: Promise<unknown>, what: string): void {
  task.catch((error: unknown) => {
    console.error(`Fehler beim ${what}:`, error);
  });
}
