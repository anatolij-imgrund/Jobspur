import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Application,
  Channel,
  InterviewMode,
  NewApplication,
  NewStatusEvent,
  Source,
  Status,
  StatusEvent,
} from '@/types/application';

/** So liegt eine Zeile in der Datenbank (snake_case). */
type ApplicationRow = {
  id: number;
  company: string;
  position: string;
  applied_at: string;
  channel: string;
  source: string;
  status: string;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  job_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Nur in der Liste: nächstes Gespräch ab heute */
  next_interview_date?: string | null;
  next_interview_time?: string | null;
};

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    appliedAt: row.applied_at,
    channel: row.channel as Channel,
    source: row.source as Source,
    status: row.status as Status,
    location: row.location,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    jobUrl: row.job_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextInterview: row.next_interview_date
      ? { date: row.next_interview_date, time: row.next_interview_time ?? null }
      : null,
  };
}

export type ApplicationFilter = {
  search?: string;
  status?: Status | null;
  /** ISO-Datum von heute; wenn gesetzt, wird das nächste Gespräch mitgeladen. */
  today?: string;
};

/** Alle Bewerbungen, neueste zuerst, optional gefiltert. */
export async function listApplications(
  db: SQLiteDatabase,
  filter: ApplicationFilter = {},
): Promise<Application[]> {
  const where: string[] = [];
  const params: string[] = [];
  const selectParams: string[] = [];

  const search = filter.search?.trim();
  if (search) {
    where.push('(a.company LIKE ? OR a.position LIKE ? OR a.location LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (filter.status) {
    where.push('a.status = ?');
    params.push(filter.status);
  }

  // Das nächste geplante Gespräch je Bewerbung, aber nur solange sie offen ist.
  let nextInterview = '';
  if (filter.today) {
    nextInterview = `,
      (SELECT e.date FROM status_events e
        WHERE e.application_id = a.id AND e.status = 'interview' AND e.date >= ?
          AND a.status NOT IN ('offer', 'rejected')
        ORDER BY e.date, e.time LIMIT 1) AS next_interview_date,
      (SELECT e.time FROM status_events e
        WHERE e.application_id = a.id AND e.status = 'interview' AND e.date >= ?
          AND a.status NOT IN ('offer', 'rejected')
        ORDER BY e.date, e.time LIMIT 1) AS next_interview_time`;
    selectParams.push(filter.today, filter.today);
  }

  const sql = `
    SELECT a.*${nextInterview} FROM applications a
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY a.applied_at DESC, a.id DESC
  `;
  const rows = await db.getAllAsync<ApplicationRow>(sql, [...selectParams, ...params]);
  return rows.map(toApplication);
}

export async function getApplication(
  db: SQLiteDatabase,
  id: number,
): Promise<Application | null> {
  const row = await db.getFirstAsync<ApplicationRow>(
    'SELECT * FROM applications WHERE id = ?',
    id,
  );
  return row ? toApplication(row) : null;
}

/** Legt eine Bewerbung an und schreibt den ersten Eintrag im Statusverlauf. */
export async function createApplication(
  db: SQLiteDatabase,
  input: NewApplication,
): Promise<number> {
  const status = input.status ?? 'applied';
  let id = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO applications
        (company, position, applied_at, channel, source, status,
         location, contact_name, contact_email, job_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.company.trim(),
      input.position.trim(),
      input.appliedAt,
      input.channel,
      input.source,
      status,
      input.location,
      input.contactName,
      input.contactEmail,
      input.jobUrl,
      input.notes,
    );
    id = result.lastInsertRowId;

    await db.runAsync(
      'INSERT INTO status_events (application_id, status, date) VALUES (?, ?, ?)',
      id,
      status,
      input.appliedAt,
    );
  });

  return id;
}

/**
 * Ändert die Angaben einer Bewerbung. Verschiebt sich das Bewerbungsdatum,
 * wandert der erste Eintrag im Verlauf mit.
 */
export async function updateApplication(
  db: SQLiteDatabase,
  id: number,
  input: NewApplication,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE applications SET
         company = ?, position = ?, applied_at = ?, channel = ?, source = ?,
         location = ?, contact_name = ?, contact_email = ?, job_url = ?, notes = ?,
         updated_at = datetime('now')
       WHERE id = ?`,
      input.company.trim(),
      input.position.trim(),
      input.appliedAt,
      input.channel,
      input.source,
      input.location,
      input.contactName,
      input.contactEmail,
      input.jobUrl,
      input.notes,
      id,
    );
    await db.runAsync(
      `UPDATE status_events SET date = ?
       WHERE id = (SELECT MIN(id) FROM status_events WHERE application_id = ?)`,
      input.appliedAt,
      id,
    );
    await syncCurrentStatus(db, id);
  });
}

/**
 * Löscht die Bewerbung samt Verlauf (ON DELETE CASCADE).
 * Gibt die Ids der Erinnerungen zurück, die jetzt abgesagt werden müssen.
 */
export async function deleteApplication(db: SQLiteDatabase, id: number): Promise<string[]> {
  const reminders = await reminderIdsWhere(db, 'application_id = ?', id);
  await db.runAsync('DELETE FROM applications WHERE id = ?', id);
  return reminders;
}

// ── Statusverlauf ──────────────────────────────────────────────────

type StatusEventRow = {
  id: number;
  application_id: number;
  status: string;
  date: string;
  note: string | null;
  time: string | null;
  mode: string | null;
  reminder_ids: string | null;
};

function parseIds(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function toStatusEvent(r: StatusEventRow): StatusEvent {
  return {
    id: r.id,
    applicationId: r.application_id,
    status: r.status as Status,
    date: r.date,
    note: r.note,
    time: r.time,
    mode: r.mode as InterviewMode | null,
    reminderIds: parseIds(r.reminder_ids),
  };
}

/** Alle Erinnerungs-Ids der Einträge, auf die `where` zutrifft. */
async function reminderIdsWhere(
  db: SQLiteDatabase,
  where: string,
  ...params: (string | number)[]
): Promise<string[]> {
  const rows = await db.getAllAsync<{ reminder_ids: string | null }>(
    `SELECT reminder_ids FROM status_events WHERE ${where}`,
    params,
  );
  return rows.flatMap((r) => parseIds(r.reminder_ids));
}

/** Verlauf einer Bewerbung, neuester Eintrag zuerst. */
export async function listStatusEvents(
  db: SQLiteDatabase,
  applicationId: number,
): Promise<StatusEvent[]> {
  const rows = await db.getAllAsync<StatusEventRow>(
    `SELECT * FROM status_events WHERE application_id = ?
     ORDER BY date DESC, id DESC`,
    applicationId,
  );
  return rows.map(toStatusEvent);
}

/**
 * Setzt den aktuellen Status auf den jüngsten Eintrag im Verlauf.
 * Bei gleichem Datum gewinnt der später eingetragene.
 */
async function syncCurrentStatus(db: SQLiteDatabase, applicationId: number): Promise<void> {
  await db.runAsync(
    `UPDATE applications SET
       status = COALESCE(
         (SELECT status FROM status_events WHERE application_id = ?
          ORDER BY date DESC, id DESC LIMIT 1),
         'applied'),
       updated_at = datetime('now')
     WHERE id = ?`,
    applicationId,
    applicationId,
  );
}

export type AddStatusResult = {
  eventId: number;
  /** Erinnerungen entfernter Termine, die abgesagt werden müssen */
  cancelledReminderIds: string[];
};

/**
 * Schreibt einen neuen Eintrag in den Verlauf.
 *
 * Mit `dropLaterInterviews` werden geplante Gespräche nach diesem Datum
 * entfernt, z. B. wenn vor dem Termin eine Absage kommt. Sonst bliebe der
 * Termin der jüngste Eintrag, und die Absage würde nie zum aktuellen Status.
 */
export async function addStatusEvent(
  db: SQLiteDatabase,
  applicationId: number,
  event: NewStatusEvent,
  options: { dropLaterInterviews?: boolean } = {},
): Promise<AddStatusResult> {
  let eventId = 0;
  let cancelledReminderIds: string[] = [];
  const isInterview = event.status === 'interview';

  await db.withTransactionAsync(async () => {
    if (options.dropLaterInterviews) {
      const where = `application_id = ? AND status = 'interview' AND date > ?`;
      cancelledReminderIds = await reminderIdsWhere(db, where, applicationId, event.date);
      await db.runAsync(`DELETE FROM status_events WHERE ${where}`, applicationId, event.date);
    }
    const result = await db.runAsync(
      `INSERT INTO status_events (application_id, status, date, note, time, mode)
       VALUES (?, ?, ?, ?, ?, ?)`,
      applicationId,
      event.status,
      event.date,
      event.note,
      isInterview ? (event.time ?? null) : null,
      isInterview ? (event.mode ?? null) : null,
    );
    eventId = result.lastInsertRowId;
    await syncCurrentStatus(db, applicationId);
  });

  return { eventId, cancelledReminderIds };
}

/** Merkt sich, welche Erinnerungen zu einem Termin geplant wurden. */
export async function setReminderIds(
  db: SQLiteDatabase,
  eventId: number,
  ids: string[],
): Promise<void> {
  await db.runAsync(
    'UPDATE status_events SET reminder_ids = ? WHERE id = ?',
    ids.length ? JSON.stringify(ids) : null,
    eventId,
  );
}

/**
 * Entfernt einen Eintrag aus dem Verlauf. Der erste Eintrag
 * („Beworben“) gehört zur Bewerbung selbst und bleibt stehen.
 */
export async function deleteStatusEvent(
  db: SQLiteDatabase,
  applicationId: number,
  eventId: number,
): Promise<string[]> {
  const reminders = await reminderIdsWhere(db, 'id = ? AND application_id = ?', eventId, applicationId);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM status_events
       WHERE id = ? AND application_id = ?
         AND id <> (SELECT MIN(id) FROM status_events WHERE application_id = ?)`,
      eventId,
      applicationId,
      applicationId,
    );
    await syncCurrentStatus(db, applicationId);
  });
  return reminders;
}

/**
 * Frühestes Datum eines späteren Verlaufseintrags (ohne „Beworben“).
 * Das Bewerbungsdatum darf nicht danach liegen.
 */
export async function getEarliestFollowUpDate(
  db: SQLiteDatabase,
  applicationId: number,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ d: string | null }>(
    `SELECT MIN(date) AS d FROM status_events
     WHERE application_id = ?
       AND id <> (SELECT MIN(id) FROM status_events WHERE application_id = ?)`,
    applicationId,
    applicationId,
  );
  return row?.d ?? null;
}

/** Id des ersten Verlaufseintrags; der lässt sich nicht löschen. */
export async function getFirstStatusEventId(
  db: SQLiteDatabase,
  applicationId: number,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number | null }>(
    'SELECT MIN(id) AS id FROM status_events WHERE application_id = ?',
    applicationId,
  );
  return row?.id ?? null;
}

/** ISO-Daten (YYYY-MM-DD) aller Bewerbungen im angegebenen Monat. */
export async function getApplicationDatesInMonth(
  db: SQLiteDatabase,
  year: number,
  month: number,
): Promise<string[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-%`;
  const rows = await db.getAllAsync<{ applied_at: string }>(
    'SELECT applied_at FROM applications WHERE applied_at LIKE ?',
    prefix,
  );
  return rows.map((r) => r.applied_at);
}

export type UpcomingInterview = {
  applicationId: number;
  company: string;
  position: string;
  event: StatusEvent;
};

/** Geplante Gespräche ab heute bei offenen Bewerbungen, nächstes zuerst. */
export async function listUpcomingInterviews(
  db: SQLiteDatabase,
  today: string,
): Promise<UpcomingInterview[]> {
  const rows = await db.getAllAsync<StatusEventRow & { company: string; position: string }>(
    `SELECT e.*, a.company, a.position
     FROM status_events e JOIN applications a ON a.id = e.application_id
     WHERE e.status = 'interview' AND e.date >= ?
       AND a.status NOT IN ('offer', 'rejected')
     ORDER BY e.date, e.time, e.id`,
    today,
  );
  return rows.map((r) => ({
    applicationId: r.application_id,
    company: r.company,
    position: r.position,
    event: toStatusEvent(r),
  }));
}

export async function countApplications(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM applications');
  return row?.n ?? 0;
}
