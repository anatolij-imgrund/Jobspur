import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as A from '@/db/applications';
import * as R from '@/db/recipients';
import { LATEST_VERSION, migrateDbIfNeeded } from '@/db/schema';

import { makeDb, makeRawDb, newApplication, userVersion } from './helpers/db';

const V1_STATUS_EVENTS = `
  DROP TABLE status_events;
  CREATE TABLE status_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    status TEXT NOT NULL, date TEXT NOT NULL, note TEXT
  );`;

describe('Migrationen', () => {
  test('neue Datenbank landet auf der aktuellen Version', async () => {
    const { raw } = await makeDb();
    assert.equal(userVersion(raw), LATEST_VERSION);
  });

  test('zweiter Start ändert nichts', async () => {
    const { db, raw } = await makeDb();
    await migrateDbIfNeeded(db);
    assert.equal(userVersion(raw), LATEST_VERSION);
  });

  test('Version 1 → aktuell behält vorhandene Bewerbungen', async () => {
    const { db, raw } = await makeDb();
    // Stand eines Handys mit Version 1 nachbauen
    raw.exec(`DROP TABLE recipients; ${V1_STATUS_EVENTS} PRAGMA user_version = 1;`);
    raw.exec(`INSERT INTO applications (company, position, applied_at, channel) VALUES ('Alt', 'Dev', '2026-09-01', 'email');
              INSERT INTO status_events (application_id, status, date) VALUES (1, 'applied', '2026-09-01');`);

    await migrateDbIfNeeded(db);

    assert.equal(userVersion(raw), LATEST_VERSION);
    assert.equal((await A.getApplication(db, 1))?.company, 'Alt');
    assert.deepEqual(await R.listRecipients(db), []);
    const [event] = await A.listStatusEvents(db, 1);
    assert.deepEqual([event.status, event.time, event.mode, event.reminderIds], ['applied', null, null, []]);
  });

  test('Abbruch mitten in einer Migration hinterlässt keinen halben Stand', async () => {
    const { db, raw } = makeRawDb();
    const crashing = {
      ...db,
      execAsync: async (sql: string) => {
        if (sql.includes('CREATE TABLE recipients')) throw new Error('Absturz');
        return db.execAsync(sql);
      },
    } as typeof db;

    await assert.rejects(migrateDbIfNeeded(crashing));
    assert.equal(userVersion(raw), 1, 'Version 1 ist vollständig, Version 2 gar nicht');

    await migrateDbIfNeeded(db);
    assert.equal(userVersion(raw), LATEST_VERSION);
  });

  test('neue Bewerbungen funktionieren nach der Migration', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    assert.ok(id > 0);
  });
});
