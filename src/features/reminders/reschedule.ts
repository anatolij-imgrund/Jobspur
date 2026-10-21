import type { SQLiteDatabase } from 'expo-sqlite';

import { listUpcomingInterviews, setReminderIds } from '@/db/applications';
import { toIsoDate } from '@/lib/dates';

import { setUpInterviewReminders } from './reminders';

/**
 * Richtet Erinnerungen für alle kommenden Gespräche neu ein, z. B. nach
 * dem Wiederherstellen einer Sicherung auf einem neuen Handy.
 * Gibt zurück, für wie viele Gespräche das geklappt hat.
 */
export async function rescheduleUpcomingReminders(db: SQLiteDatabase): Promise<number> {
  const upcoming = await listUpcomingInterviews(db, toIsoDate(new Date()));
  let done = 0;
  for (const { applicationId, company, position, event } of upcoming) {
    const result = await setUpInterviewReminders({
      applicationId,
      company,
      position,
      date: event.date,
      time: event.time,
      mode: event.mode,
    });
    if (result.ids.length) {
      await setReminderIds(db, event.id, result.ids);
      done += 1;
    }
    // Ohne Erlaubnis braucht es die übrigen Versuche nicht.
    if (!result.ok && result.reason !== 'failed') break;
  }
  return done;
}
