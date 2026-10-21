import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { SQLiteDatabase } from 'expo-sqlite';

import * as A from '@/db/applications';
import * as R from '@/db/recipients';
import { insertSampleData } from '@/db/seed';
import { getProfile, saveProfile } from '@/db/settings';
import {
  backupFileName,
  BackupError,
  buildBackup,
  describeBackup,
  folderLabel,
  getBackupFolderUri,
  getLastBackupAt,
  parseBackup,
  restoreBackup,
  setBackupFolderUri,
  setLastBackupAt,
} from '@/features/backup/backup';
import { EMPTY_PROFILE } from '@/types/profile';

import { makeDb, newApplication } from './helpers/db';

/** Alles, was nach dem Wiederherstellen gleich sein muss. */
async function snapshot(db: SQLiteDatabase) {
  return {
    apps: await db.getAllAsync('SELECT id, company, position, applied_at, channel, source, status, location, contact_name, contact_email, job_url, notes FROM applications ORDER BY id'),
    events: await db.getAllAsync('SELECT id, application_id, status, date, note, time, mode FROM status_events ORDER BY id'),
    recipients: await db.getAllAsync('SELECT id, kind, name, customer_number, bg_number, contact_person, street, zip, city FROM recipients ORDER BY id'),
    profile: await getProfile(db),
  };
}

/** Handy A mit Beispieldaten, Profil, Stelle, Termin mit Erinnerung. */
async function sourceDevice() {
  const a = await makeDb();
  await insertSampleData(a.db);
  await saveProfile(a.db, { ...EMPTY_PROFILE, name: 'Anatolij Imgrund', city: 'Köln' });
  await R.createRecipient(a.db, { kind: 'jobcenter', name: 'Jobcenter Köln', customerNumber: '123D456', bgNumber: '999', contactPerson: null, street: null, zip: null, city: null });
  const [first] = await A.listApplications(a.db);
  const { eventId } = await A.addStatusEvent(a.db, first.id, { status: 'interview', date: '2099-01-05', note: 'Sonderzeichen "<>&ü', time: '10:00', mode: 'video' });
  await A.setReminderIds(a.db, eventId, ['geraet-a-1']);
  await setLastBackupAt(a.db, '2026-10-21');
  await setBackupFolderUri(a.db, 'content://a/tree/primary%3ADownload');
  return a;
}

// Kleinste gültige Sicherung als Ausgangspunkt für Angriffe
const app = (over: object = {}) => ({ id: 1, company: 'Muster', position: 'Dev', applied_at: '2026-10-01', channel: 'email', source: 'own', status: 'applied', location: null, contact_name: null, contact_email: null, job_url: null, notes: null, created_at: 'x', updated_at: 'x', ...over });
const ev = (over: object = {}) => ({ id: 1, application_id: 1, status: 'applied', date: '2026-10-01', note: null, ...over });
const file = (o: object = {}) => JSON.stringify({ app: 'bewerbungstracker', schemaVersion: 3, exportedAt: '2026-10-21T00:00:00Z', applications: [app()], statusEvents: [ev()], recipients: [], settings: [], ...o });

function assertRejected(text: string, part: string) {
  assert.throws(() => parseBackup(text), (e: unknown) => e instanceof BackupError && e.message.includes(part));
}

describe('Sicherung erstellen und wiederherstellen', () => {
  test('auf einem anderen Handy kommt alles genau so wieder an', async () => {
    const a = await sourceDevice();
    const text = JSON.stringify(await buildBackup(a.db));

    const b = await makeDb();
    await restoreBackup(b.db, parseBackup(text));

    assert.deepEqual(await snapshot(b.db), await snapshot(a.db));
  });

  test('gerätebezogenes bleibt draußen: Erinnerungen, letzter Zeitpunkt, Ordner', async () => {
    const a = await sourceDevice();
    const text = JSON.stringify(await buildBackup(a.db));
    for (const part of ['geraet-a-1', 'reminder_ids', 'lastBackupAt', 'backupFolderUri', 'content://']) {
      assert.ok(!text.includes(part), part);
    }

    const b = await makeDb();
    await setLastBackupAt(b.db, '2026-09-01');
    await setBackupFolderUri(b.db, 'content://b/tree/primary%3ADocuments');
    await restoreBackup(b.db, parseBackup(text));
    assert.equal(await getLastBackupAt(b.db), '2026-09-01');
    assert.equal(await getBackupFolderUri(b.db), 'content://b/tree/primary%3ADocuments');
  });

  test('alte Daten werden ersetzt, ihre Erinnerungen zum Absagen zurückgegeben', async () => {
    const text = JSON.stringify(await buildBackup((await sourceDevice()).db));
    const b = await makeDb();
    const id = await A.createApplication(b.db, newApplication({ company: 'Wird ersetzt' }));
    const { eventId } = await A.addStatusEvent(b.db, id, { status: 'interview', date: '2099-02-02', note: null, time: '09:00', mode: 'phone' });
    await A.setReminderIds(b.db, eventId, ['b1', 'b2']);

    assert.deepEqual(await restoreBackup(b.db, parseBackup(text)), ['b1', 'b2']);
    assert.ok(!(await A.listApplications(b.db)).some((x) => x.company === 'Wird ersetzt'));
  });

  test('nach dem Wiederherstellen kollidieren neue Ids nicht', async () => {
    const backup = await buildBackup((await sourceDevice()).db);
    const b = await makeDb();
    await restoreBackup(b.db, parseBackup(JSON.stringify(backup)));
    const id = await A.createApplication(b.db, newApplication());
    assert.ok(id > Math.max(...backup.applications.map((x) => x.id)));
  });

  test('Abbruch mittendrin lässt die alten Daten unverändert', async () => {
    const text = JSON.stringify(await buildBackup((await sourceDevice()).db));
    const d = await makeDb();
    await A.createApplication(d.db, newApplication({ company: 'Bleibt' }));
    const before = await snapshot(d.db);
    let calls = 0;
    const crashing = {
      ...d.db,
      runAsync: async (sql: string, ...p: unknown[]) => {
        if (sql.includes('INSERT INTO status_events') && ++calls === 3) throw new Error('Absturz');
        return (d.db.runAsync as (s: string, ...q: unknown[]) => unknown)(sql, ...p);
      },
    } as unknown as SQLiteDatabase;

    await assert.rejects(restoreBackup(crashing, parseBackup(text)));
    assert.deepEqual(await snapshot(d.db), before);
  });

  test('ältere Sicherungen ohne spätere Felder lassen sich einlesen', async () => {
    const v1 = JSON.stringify({ app: 'bewerbungstracker', schemaVersion: 1, exportedAt: 'x', applications: [app()], statusEvents: [ev()], settings: [] });
    const c = await makeDb();
    await restoreBackup(c.db, parseBackup(v1));
    assert.equal((await A.listStatusEvents(c.db, 1))[0].time, null);
  });

  test('Status wird aus dem Verlauf abgeleitet, nicht aus der Datei geglaubt', async () => {
    const lying = file({ applications: [app({ status: 'offer' })], statusEvents: [ev(), ev({ id: 2, status: 'interview', date: '2026-10-05' })] });
    const c = await makeDb();
    await restoreBackup(c.db, parseBackup(lying));
    assert.equal((await A.getApplication(c.db, 1))?.status, 'interview');
  });

  test('Beschreibung, Dateiname und Ordnername', async () => {
    const backup = await buildBackup((await sourceDevice()).db, new Date(2026, 9, 21, 12));
    assert.equal(describeBackup(backup), 'Sicherung vom 21.10.2026: 5 Bewerbungen, 1 Stelle.');
    assert.equal(backupFileName(new Date(2026, 9, 21)), 'Jobspur_Sicherung_2026-10-21.json');
    assert.equal(folderLabel('content://x/tree/primary%3ADownload'), 'Download');
    assert.equal(folderLabel('content://x/tree/primary%3ADocuments%2FBewerbungen'), 'Documents/Bewerbungen');
    assert.equal(folderLabel('content://x/tree/primary%3A'), 'Interner Speicher');
  });
});

describe('Präparierte oder kaputte Sicherungsdateien', () => {
  test('kein JSON, fremde Datei, neuere App-Version', () => {
    assertRejected('hallo', 'kein gültiges JSON');
    assertRejected('{"foo":1}', 'keine Sicherung dieser App');
    assertRejected(file({ schemaVersion: 99 }), 'neueren Version');
  });

  test('falsche Werte und Formate', () => {
    assertRejected(file({ applications: [app({ status: 'verschollen' })] }), 'beschädigt');
    assertRejected(file({ applications: [app({ applied_at: '21.10.2026' })] }), 'applications.0.applied_at');
    assertRejected(file({ applications: [app({ contact_email: 'keine-mail' })] }), 'contact_email');
  });

  test('übergroße Inhalte', () => {
    assertRejected(file({ applications: [app({ notes: 'x'.repeat(5_000_000) })] }), 'applications.0.notes');
  });

  test('unlogischer Verlauf mit konkreter Meldung', () => {
    assertRejected(file({ applications: [app(), app()] }), 'Bewerbung 1 kommt doppelt vor');
    assertRejected(file({ statusEvents: [ev({ status: 'offer' })] }), 'beginnt nicht mit „Beworben“');
    assertRejected(file({ statusEvents: [ev(), ev({ id: 2, application_id: 99 })] }), 'gehört zu keiner Bewerbung');
    assertRejected(file({ statusEvents: [ev(), ev({ id: 2, date: '2026-09-01' })] }), 'liegt vor der Bewerbung');
    assertRejected(file({ statusEvents: [] }), 'hat keinen Verlauf');
  });

  test('SQL im Firmennamen landet nur als Text in der Datenbank', async () => {
    const c = await makeDb();
    await restoreBackup(c.db, parseBackup(file({ applications: [app({ company: "x'); DROP TABLE applications; --" })] })));
    assert.equal((await A.getApplication(c.db, 1))?.company, "x'); DROP TABLE applications; --");
  });

  test('Profil mit falschem Datentyp wird ignoriert, unbekannte Einstellungen ebenso', async () => {
    const c = await makeDb();
    await restoreBackup(c.db, parseBackup(file({ settings: [
      { key: 'profile', value: '{"name":{"boese":true}}' },
      { key: 'irgendwas', value: 'x' },
    ] })));
    assert.deepEqual(await getProfile(c.db), EMPTY_PROFILE);
    assert.equal((await c.db.getAllAsync('SELECT * FROM settings')).length, 0);
  });
});
