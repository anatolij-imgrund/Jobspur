// Monatsnamen fest hinterlegt, damit die Ausgabe nicht von der
// Intl-Unterstützung des jeweiligen Geräts abhängt.
const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Date → "2026-10-20" in lokaler Zeit (nicht UTC). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-10-20" → "20.10.2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** "2026-10" → "Oktober 2026" */
export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Monatsname zur Monatsnummer 1–12. */
export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** "2026-10-20" → "2026-10" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
