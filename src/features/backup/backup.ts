import type { SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

import { LATEST_VERSION } from '@/db/schema';
import { CHANNELS, INTERVIEW_MODES, SOURCES, STATUSES } from '@/types/application';
import { RECIPIENT_KINDS } from '@/types/profile';

/** Erkennungszeichen, damit nicht jede beliebige JSON-Datei eingelesen wird. */
const APP_ID = 'bewerbungstracker';

/**
 * Obergrenzen für alles, was aus einer Datei kommt. Großzügig für echte
 * Nutzung, aber eng genug, dass eine präparierte Datei die App weder
 * lahmlegt noch den Speicher sprengt. Die Textlängen entsprechen den
 * Formularen.
 */
export const LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  applications: 10_000,
  statusEvents: 100_000,
  recipients: 100,
} as const;

// ── Aufbau der Sicherungsdatei ──────────────────────────────────────
// Die Zeilen werden so gespeichert, wie sie in der Datenbank liegen
// (snake_case). Felder, die erst in späteren Versionen dazukamen, sind
// optional, damit sich auch ältere Sicherungen einlesen lassen.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = (max: number) => z.string().min(1).max(max);
const optText = (max: number) => z.string().max(max).nullable().optional();
const stamp = z.string().max(40);

const applicationRow = z.object({
  id: z.number().int().positive(),
  company: text(120),
  position: text(160),
  applied_at: isoDate,
  channel: z.enum(CHANNELS),
  source: z.enum(SOURCES),
  status: z.enum(STATUSES),
  location: optText(120),
  contact_name: optText(120),
  contact_email: z.email().max(200).nullable().optional(),
  job_url: optText(500),
  notes: optText(2000),
  created_at: stamp,
  updated_at: stamp,
});

const statusEventRow = z.object({
  id: z.number().int().positive(),
  application_id: z.number().int().positive(),
  status: z.enum(STATUSES),
  date: isoDate,
  note: optText(2000),
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
  name: text(120),
  customer_number: optText(40),
  bg_number: optText(40),
  contact_person: optText(120),
  street: optText(120),
  zip: optText(5),
  city: optText(80),
  created_at: stamp.optional(),
});

/**
 * Nur bekannte Einstellungen werden übernommen. Das Profil liegt als JSON
 * im Feld `value`; auch dessen Inhalt wird geprüft, denn ein Objekt statt
 * eines Textes würde später z. B. das PDF abstürzen lassen.
 */
const profileValue = z.object({
  name: z.string().max(120),
  street: z.string().max(120),
  zip: z.string().max(5),
  city: z.string().max(80),
  email: z.string().max(200),
  phone: z.string().max(40),
});
const settingRow = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('profile'),
    value: z.string().max(5000).refine((v) => {
      try {
        return profileValue.partial().safeParse(JSON.parse(v)).success;
      } catch {
        return false;
      }
    }, 'Profil ungültig'),
  }),
]);

/** Unbekannte Einstellungen (z. B. aus späteren Versionen) still auslassen. */
const settingsList = z
  .array(z.unknown())
  .max(50)
  .transform((rows) => rows.filter((r) => settingRow.safeParse(r).success))
  .pipe(z.array(settingRow));

const backupSchema = z
  .object({
    app: z.literal(APP_ID),
    schemaVersion: z.number().int().positive(),
    exportedAt: z.string(),
    applications: z.array(applicationRow).max(LIMITS.applications),
    statusEvents: z.array(statusEventRow).max(LIMITS.statusEvents),
    recipients: z.array(recipientRow).max(LIMITS.recipients).default([]),
    settings: settingsList.default([]),
  })
  .superRefine((b, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });

    // Ids müssen eindeutig sein, sonst bricht das Einfügen ab.
    for (const [name, rows] of [
      ['Bewerbung', b.applications],
      ['Verlaufseintrag', b.statusEvents],
      ['Stelle', b.recipients],
    ] as const) {
      const seen = new Set<number>();
      for (const row of rows) {
        if (seen.has(row.id)) return issue(`${name} ${row.id} kommt doppelt vor`);
        seen.add(row.id);
      }
    }

    // Der Verlauf muss zur Bewerbung passen: gleiche Regeln wie in der App.
    const apps = new Map(b.applications.map((a) => [a.id, a]));
    const firstEvent = new Map<number, (typeof b.statusEvents)[number]>();
    for (const e of b.statusEvents) {
      const a = apps.get(e.application_id);
      if (!a) return issue(`Verlaufseintrag ${e.id} gehört zu keiner Bewerbung`);
      if (e.date < a.applied_at) return issue(`Verlaufseintrag ${e.id} liegt vor der Bewerbung`);
      const first = firstEvent.get(a.id);
      if (!first || e.id < first.id) firstEvent.set(a.id, e);
    }
    for (const a of b.applications) {
      const first = firstEvent.get(a.id);
      if (!first) return issue(`Bewerbung ${a.id} hat keinen Verlauf`);
      if (first.status !== 'applied') return issue(`Verlauf von Bewerbung ${a.id} beginnt nicht mit „Beworben“`);
    }
  });

export type Backup = z.infer<typeof backupSchema>;

export class BackupError extends Error {}

/**
 * Einstellungen, die nur zu diesem Handy gehören. Sie kommen nicht in die
 * Sicherung und bleiben beim Wiederherstellen stehen.
 */
const DEVICE_SETTINGS = ['lastBackupAt', 'backupFolderUri'] as const;
const DEVICE_SETTINGS_SQL = DEVICE_SETTINGS.map((k) => `'${k}'`).join(', ');

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
      `SELECT key, value FROM settings WHERE key NOT IN (${DEVICE_SETTINGS_SQL}) ORDER BY key`,
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
    // Eigene Prüfungen haben eine verständliche Meldung, Formatfehler einen Pfad.
    const detail =
      first.code === 'custom'
        ? `: ${first.message}`
        : first.path.length
          ? ` (bei ${first.path.join('.')})`
          : '';
    throw new BackupError(`Die Sicherung ist beschädigt oder unvollständig${detail}.`);
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
      DELETE FROM settings WHERE key NOT IN (${DEVICE_SETTINGS_SQL});
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
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', s.key, s.value);
    }

    // Den aktuellen Status nicht aus der Datei glauben, sondern wie in der
    // App aus dem Verlauf ableiten: jüngster Eintrag gewinnt.
    await db.execAsync(`
      UPDATE applications SET status = (
        SELECT e.status FROM status_events e
        WHERE e.application_id = applications.id
        ORDER BY e.date DESC, e.id DESC LIMIT 1
      );
    `);
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

export async function getBackupFolderUri(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT value FROM settings WHERE key = 'backupFolderUri'",
  );
  return row?.value ?? null;
}

export async function setBackupFolderUri(db: SQLiteDatabase, uri: string | null): Promise<void> {
  if (uri === null) {
    await db.runAsync("DELETE FROM settings WHERE key = 'backupFolderUri'");
    return;
  }
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES ('backupFolderUri', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    uri,
  );
}

/** Lesbarer Ordnername aus einer Android-Ordneradresse, z. B. „Download“. */
export function folderLabel(uri: string): string {
  // Adressen sehen etwa so aus: content://…/tree/primary%3ADownload%2FBackups
  const tree = decodeURIComponent(uri.split('/tree/')[1] ?? uri);
  const path = tree.includes(':') ? tree.slice(tree.indexOf(':') + 1) : tree;
  return path || 'Interner Speicher';
}

/** Dateiname mit Datum, z. B. Bewerbungstracker_Sicherung_2026-10-21.json */
export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `Bewerbungstracker_Sicherung_${d}.json`;
}
