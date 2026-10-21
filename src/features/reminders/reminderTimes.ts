import { toLocalDateTime } from '@/lib/dates';

export type ReminderSlot = {
  at: Date;
  kind: 'eveningBefore' | 'hourBefore' | 'morningOf';
};

/** Abends vorher: Zeit, um Unterlagen und Weg vorzubereiten. */
const EVENING_HOUR = 18;
/** Ohne Uhrzeit: morgens am Tag des Gesprächs. */
const MORNING_HOUR = 8;

/**
 * Wann an ein Gespräch erinnert wird. Reine Funktion ohne Seiteneffekte,
 * damit sie sich ohne Handy testen lässt.
 *
 * - am Vorabend um 18:00
 * - mit Uhrzeit: eine Stunde vorher
 * - ohne Uhrzeit: um 08:00 am selben Tag
 *
 * Zeitpunkte, die schon vorbei sind, fallen weg.
 */
export function reminderSlots(date: string, time: string | null, now: Date): ReminderSlot[] {
  const day = toLocalDateTime(date, null);
  const slots: ReminderSlot[] = [];

  const evening = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, EVENING_HOUR);
  slots.push({ at: evening, kind: 'eveningBefore' });

  if (time) {
    const start = toLocalDateTime(date, time);
    const hourBefore = new Date(start.getTime() - 60 * 60 * 1000);
    slots.push({ at: hourBefore, kind: 'hourBefore' });
  } else {
    const morning = new Date(day.getFullYear(), day.getMonth(), day.getDate(), MORNING_HOUR);
    slots.push({ at: morning, kind: 'morningOf' });
  }

  return slots.filter((s) => s.at.getTime() > now.getTime());
}
