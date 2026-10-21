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

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** "2026-11-05" → "Do, 05.11." */
export function formatWeekdayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** "2026-11-05" + "10:00" → lokales Date-Objekt; ohne Uhrzeit 00:00 */
export function toLocalDateTime(iso: string, time: string | null): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, min] = (time ?? '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

/** Date → "HH:MM" */
export function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Monatsname zur Monatsnummer 1–12. */
export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** "2026-10-20" → "2026-10" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Ganze Kalendertage von `iso` bis heute (heute = 0). */
export function daysSince(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - then) / 86_400_000);
}

/** 0 → "heute", 1 → "gestern", n → "vor n Tagen" */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  return `vor ${days} Tagen`;
}

export type DateRange = { from: string; to: string };

/** Vorgefertigte Zeiträume für den Nachweis, bezogen auf `today`. */
export function presetRange(
  preset: 'thisMonth' | 'lastMonth' | 'last4Weeks',
  today = new Date(),
): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case 'thisMonth':
      return { from: toIsoDate(new Date(y, m, 1)), to: toIsoDate(today) };
    case 'lastMonth':
      // Tag 0 des aktuellen Monats = letzter Tag des Vormonats
      return { from: toIsoDate(new Date(y, m - 1, 1)), to: toIsoDate(new Date(y, m, 0)) };
    case 'last4Weeks': {
      const from = new Date(y, m, today.getDate() - 27);
      return { from: toIsoDate(from), to: toIsoDate(today) };
    }
  }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
