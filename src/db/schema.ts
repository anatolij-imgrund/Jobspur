import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'bewerbungen.db';

/**
 * Jede Schemaänderung bekommt hier eine neue Nummer mit ihrem SQL.
 * Bestehende Einträge nie verändern: Sie laufen auf Geräten, die noch
 * eine ältere Version haben.
 */
const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE applications (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      company       TEXT NOT NULL,
      position      TEXT NOT NULL,
      applied_at    TEXT NOT NULL,
      channel       TEXT NOT NULL,
      source        TEXT NOT NULL DEFAULT 'own',
      status        TEXT NOT NULL DEFAULT 'applied',
      location      TEXT,
      contact_name  TEXT,
      contact_email TEXT,
      job_url       TEXT,
      notes         TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_applications_applied_at ON applications (applied_at);

    CREATE TABLE status_events (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
      status         TEXT NOT NULL,
      date           TEXT NOT NULL,
      note           TEXT
    );
    CREATE INDEX idx_status_events_application ON status_events (application_id);

    CREATE TABLE settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `,

  // Stellen, an die Nachweise gehen (Agentur, Jobcenter, …)
  2: `
    CREATE TABLE recipients (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      kind            TEXT NOT NULL,
      name            TEXT NOT NULL,
      customer_number TEXT,
      bg_number       TEXT,
      contact_person  TEXT,
      street          TEXT,
      zip             TEXT,
      city            TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,

  // Gesprächstermine: Uhrzeit, Art und die Ids der Erinnerungen
  3: `
    ALTER TABLE status_events ADD COLUMN time TEXT;
    ALTER TABLE status_events ADD COLUMN mode TEXT;
    ALTER TABLE status_events ADD COLUMN reminder_ids TEXT;
  `,

  // Fotos, z. B. von der Stellenanzeige. Die Bilder selbst liegen als
  // Dateien im App-Ordner, hier steht nur der Dateiname.
  4: `
    CREATE TABLE photos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
      file_name      TEXT NOT NULL UNIQUE,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_photos_application ON photos (application_id);
  `,
};

export const LATEST_VERSION = Math.max(...Object.keys(MIGRATIONS).map(Number));

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Gilt pro Verbindung, deshalb bei jedem Start setzen.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  // Jede Version in einer eigenen Transaktion: Bricht die App mittendrin ab,
  // bleibt die Datenbank auf der letzten vollständigen Version stehen und
  // die Migration läuft beim nächsten Start sauber noch einmal.
  while (version < LATEST_VERSION) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[next]);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
