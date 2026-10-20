import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Application,
  Channel,
  NewApplication,
  Source,
  Status,
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
  };
}

export type ApplicationFilter = {
  search?: string;
  status?: Status | null;
};

/** Alle Bewerbungen, neueste zuerst, optional gefiltert. */
export async function listApplications(
  db: SQLiteDatabase,
  filter: ApplicationFilter = {},
): Promise<Application[]> {
  const where: string[] = [];
  const params: string[] = [];

  const search = filter.search?.trim();
  if (search) {
    where.push('(company LIKE ? OR position LIKE ? OR location LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (filter.status) {
    where.push('status = ?');
    params.push(filter.status);
  }

  const sql = `
    SELECT * FROM applications
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY applied_at DESC, id DESC
  `;
  const rows = await db.getAllAsync<ApplicationRow>(sql, params);
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

export async function countApplications(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM applications');
  return row?.n ?? 0;
}
