import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { LATEST_VERSION } from '@/db/schema';
import { CHANNELS, INTERVIEW_MODES, SOURCES, STATUSES } from '@/types/application';
import { RECIPIENT_KINDS } from '@/types/profile';

/** Erkennungszeichen, damit nicht jede beliebige JSON-Datei eingelesen wird. */
const APP_ID = 'bewerbungstracker';

// ── Aufbau der Sicherungsdatei ──────────────────────────────────────
// Die Zeilen werden so gespeichert, wie sie in der Datenbank liegen
// (snake_case). Felder, die erst in späteren Versionen dazukamen, sind
// optional, damit sich auch ältere Sicherungen einlesen lassen.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optText = z.string().nullable().optional();

const applicationRow = z.object({
  id: z.number().int().positive(),
  company: z.string().min(1),
  position: z.string().min(1),
  applied_at: isoDate,
  channel: z.enum(CHANNELS),
  source: z.enum(SOURCES),
  status: z.enum(STATUSES),
  location: optText,
  contact_name: optText,
  contact_email: optText,
  job_url: optText,
  notes: optText,
  created_at: z.string(),
  updated_at: z.string(),
});

const statusEventRow = z.object({
  id: z.number().int().positive(),
  application_id: z.number().int().positive(),
  status: z.enum(STATUSES),
  date: isoDate,
  note: optText,
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  mode: z.enum(INTERVIEW_MODES).nullable().optional(),
});

const recipientRow = z.object({
  id: z.number().int().positive(),
  kind: z.enum(RECIPIENT_KINDS),
  name: z.string().min(1),
  customer_number: optText,
  bg_number: optText,
  contact_person: optText,
  street: optText,
  zip: optText,
  city: optText,
  created_at: z.string().optional(),
});

const settingRow = z.object({ key: z.string().min(1), value: z.string().nullable() });

const backupSchema = z
  .object({
    app: z.literal(APP_ID),
    schemaVersion: z.number().int().positive(),
    exportedAt: z.string(),
    applications: z.array(applicationRow),
    statusEvents: z.array(statusEventRow),
    recipients: z.array(recipientRow).default([]),
    settings: z.array(settingRow).default([]),
  })
  .superRefine((b, ctx) => {
    // Jeder Verlaufseintrag muss zu einer Bewerbung in der Datei gehören.
    const ids = new Set(b.applications.map((a) => a.id));
    const orphan = b.statusEvents.find((e) => !ids.has(e.application_id));
    if (orphan) {
      ctx.addIssue({
        code: 'custom',
        message: `Verlaufseintrag ${orphan.id} gehört zu keiner Bewerbung`,
      });
    }
  });

export type Backup = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

// ── Erstellen ───────────────────────────────────────────────────────

/** Liest alles aus der Datenbank, was in die Sicherung gehört. */
export async function buildBackup(db: SQLiteDatabase, now = new Date()): Promise<Backup> {
  const [applications, statusEvents, recipients, settings] = await Promise.all([
    db.getAllAsync<Backup['applications'][number]>('SELECT * FROM applications ORDER BY id'),
    // Erinnerungs-Ids gelten nur auf diesem Handy und bleiben deshalb draußen.
    db.getAllAsync<Backup['statusEvents'][number]>(
      'SELECT id, application_id, status, date, note, time, mode FROM status_events ORDER BY id',
    ),
    db.getAllAsync<Backup['recipients'][number]>('SELECT * FROM recipients ORDER BY id'),
    db.getAllAsync<Backup['settings'][number]>(
      // Der Zeitpunkt der letzten Sicherung gehört zum Gerät, nicht zu den Daten.
      "SELECT key, value FROM settings WHERE key <> 'lastBackupAt' ORDER BY key",
    ),
  ]);
  return {
    app: APP_ID,
    schemaVersion: LATEST_VERSION,
    exportedAt: now.toISOString(),
    applications,
    statusEvents,
    recipients,
    settings,
  };
}

// ── Prüfen ──────────────────────────────────────────────────────────

/**
 * Prüft den Inhalt einer Sicherungsdatei vollständig, bevor irgendetwas
 * geändert wird. Wirft BackupError mit einer Meldung für den Menschen.
 */
export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BackupError('Die Datei ist keine Sicherung dieser App (kein gültiges JSON).');
  }

  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== APP_ID) {
    throw new BackupError('Die Datei ist keine Sicherung dieser App.');
  }
  const version = (json as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === 'number' && version > LATEST_VERSION) {
    throw new BackupError(
      'Die Sicherung stammt aus einer neueren Version der App. Bitte aktualisiere die App zuerst.',
    );
  }

  const result = backupSchema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first.path.length ? ` (bei ${first.path.join('.')})` : '';
    throw new BackupError(`Die Sicherung ist beschädigt oder unvollständig${where}.`);
  }
  return result.data;
}

/** Kurze Zusammenfassung für die Rückfrage vor dem Wiederherstellen. */
export function describeBackup(b: Backup): string {
  const date = new Date(b.exportedAt);
  const when = Number.isNaN(date.getTime())
    ? ''
    : ` vom ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  const n = b.applications.length;
  const s = b.recipients.length;
  return `Sicherung${when}: ${n} ${n === 1 ? 'Bewerbung' : 'Bewerbungen'}${
    s ? `, ${s} ${s === 1 ? 'Stelle' : 'Stellen'}` : ''
  }.`;
}

// ── Wiederherstellen ────────────────────────────────────────────────

/**
 * Ersetzt alle Daten durch den Inhalt der Sicherung, in einer Transaktion:
 * Geht etwas schief, bleibt alles wie vorher.
 *
 * Gibt die Erinnerungs-Ids der bisherigen Daten zurück; die muss der
 * Aufrufer absagen, weil ihre Termine danach nicht mehr existieren.
 */
export async function restoreBackup(db: SQLiteDatabase, b: Backup): Promise<string[]> {
  const old = await db.getAllAsync<{ reminder_ids: string | null }>(
    'SELECT reminder_ids FROM status_events WHERE reminder_ids IS NOT NULL',
  );
  const oldReminderIds = old.flatMap((r) => {
    try {
      const ids: unknown = JSON.parse(r.reminder_ids ?? '[]');
      return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  });

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM status_events;
      DELETE FROM applications;
      DELETE FROM recipients;
      DELETE FROM settings WHERE key <> 'lastBackupAt';
    `);

    for (const a of b.applications) {
      await db.runAsync(
        `INSERT INTO applications
           (id, company, position, applied_at, channel, source, status, location,
            contact_name, contact_email, job_url, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        a.id, a.company, a.position, a.applied_at, a.channel, a.source, a.status,
        a.location ?? null, a.contact_name ?? null, a.contact_email ?? null,
        a.job_url ?? null, a.notes ?? null, a.created_at, a.updated_at,
      );
    }
    for (const e of b.statusEvents) {
      await db.runAsync(
        `INSERT INTO status_events (id, application_id, status, date, note, time, mode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        e.id, e.application_id, e.status, e.date, e.note ?? null, e.time ?? null, e.mode ?? null,
      );
    }
    for (const r of b.recipients) {
      await db.runAsync(
        `INSERT INTO recipients
           (id, kind, name, customer_number, bg_number, contact_person, street, zip, city)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r.id, r.kind, r.name, r.customer_number ?? null, r.bg_number ?? null,
        r.contact_person ?? null, r.street ?? null, r.zip ?? null, r.city ?? null,
      );
    }
    for (const s of b.settings) {
      if (s.key === 'lastBackupAt') continue;
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', s.key, s.value);
    }
  });

  return oldReminderIds;
}

// ── Zeitpunkt der letzten Sicherung ─────────────────────────────────

export async function getLastBackupAt(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT value FROM settings WHERE key = 'lastBackupAt'",
  );
  return row?.value ?? null;
}

export async function setLastBackupAt(db: SQLiteDatabase, iso: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('lastBackupAt', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    iso,
  );
}

/** Dateiname mit Datum, z. B. Bewerbungstracker_Sicherung_2026-10-21.json */
export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `Bewerbungstracker_Sicherung_${d}.json`;
}
