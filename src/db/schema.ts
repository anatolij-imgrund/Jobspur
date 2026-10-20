import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'bewerbungen.db';

/**
 * Erhöhen, sobald sich das Schema ändert, und unten einen neuen
 * `if (version < N)`-Block ergänzen. Alte Blöcke nie verändern:
 * Sie laufen auf Geräten, die noch eine ältere Version haben.
 */
const LATEST_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Gilt pro Verbindung, deshalb bei jedem Start setzen.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= LATEST_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
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
    `);
  }

  if (version < 2) {
    // Stellen, an die Nachweise gehen (Agentur, Jobcenter, …)
    await db.execAsync(`
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
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
}
