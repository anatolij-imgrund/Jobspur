import type { SQLiteDatabase } from 'expo-sqlite';

import type { Application, StatusEvent } from '@/types/application';

import { listApplications, listStatusEvents } from './applications';

export type ReportEntry = {
  application: Application;
  /** Verlauf, ältester Eintrag zuerst (für die Spalte „Rückmeldung“). */
  events: StatusEvent[];
};

export type FollowUp = {
  application: Application;
  event: StatusEvent;
};

export type ReportData = {
  /** ISO-Datum, einschließlich */
  from: string;
  /** ISO-Datum, einschließlich */
  to: string;
  /** Bewerbungen, die im Zeitraum verschickt wurden, älteste zuerst. */
  entries: ReportEntry[];
  /**
   * Rückmeldungen im Zeitraum zu Bewerbungen von davor, z. B. ein
   * Gespräch im November zur Bewerbung aus dem Oktober.
   */
  followUps: FollowUp[];
};

/** Alles, was in den Nachweis für den Zeitraum gehört. */
export async function getReportData(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<ReportData> {
  const all = await listApplications(db);
  const inRange = all
    .filter((a) => a.appliedAt >= from && a.appliedAt <= to)
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt) || a.id - b.id);

  const entries: ReportEntry[] = [];
  for (const application of inRange) {
    const events = (await listStatusEvents(db, application.id)).reverse();
    entries.push({ application, events });
  }

  const earlier = all.filter((a) => a.appliedAt < from);
  const followUps: FollowUp[] = [];
  for (const application of earlier) {
    const events = await listStatusEvents(db, application.id);
    for (const event of events) {
      if (event.status !== 'applied' && event.date >= from && event.date <= to) {
        followUps.push({ application, event });
      }
    }
  }
  followUps.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.event.id - b.event.id);

  return { from, to, entries, followUps };
}
