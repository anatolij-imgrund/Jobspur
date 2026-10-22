import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { SQLiteDatabase } from 'expo-sqlite';

import * as A from '@/db/applications';
import { getReportData } from '@/db/report';
import { buildBackup, parseBackup, restoreBackup } from '@/features/backup/backup';

import { makeDb, newApplication } from './helpers/db';

/** Auf der Messe vorgemerkt, abends abgeschickt. */
async function savedThenApplied(db: SQLiteDatabase) {
  const id = await A.createApplication(db, newApplication({ appliedAt: '2026-10-22' }), 'saved');
  await A.addStatusEvent(db, id, { status: 'applied', date: '2026-10-24', note: 'per E-Mail' });
  return id;
}

async function statusAndDate(db: SQLiteDatabase, id: number) {
  const app = await A.getApplication(db, id);
  return { status: app?.status, appliedAt: app?.appliedAt };
}

describe('Vorgemerkte Stellen', () => {
  test('beginnen mit „Vorgemerkt“ und dürfen danach nur „Beworben“ werden', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication({ appliedAt: '2026-10-22' }), 'saved');
    assert.deepEqual(await statusAndDate(db, id), { status: 'saved', appliedAt: '2026-10-22' });
    assert.deepEqual((await A.listStatusEvents(db, id)).map((e) => e.status), ['saved']);
  });

  test('„Beworben“ setzt Status und Bewerbungsdatum, der Verlauf behält beides', async () => {
    const { db } = await makeDb();
    const id = await savedThenApplied(db);
    assert.deepEqual(await statusAndDate(db, id), { status: 'applied', appliedAt: '2026-10-24' });
    assert.deepEqual(
      (await A.listStatusEvents(db, id)).map((e) => [e.status, e.date]),
      [['applied', '2026-10-24'], ['saved', '2026-10-22']],
    );
  });

  test('stehen nicht im Nachweis und zählen nicht im Monat', async () => {
    const { db } = await makeDb();
    await A.createApplication(db, newApplication({ company: 'Nur gemerkt', appliedAt: '2026-10-22' }), 'saved');
    const sent = await savedThenApplied(db);

    const report = await getReportData(db, '2026-10-01', '2026-10-31');
    assert.deepEqual(report.entries.map((e) => e.application.id), [sent]);
    // Im Verlauf der Bewerbung steht „Vorgemerkt“ nicht mit drin.
    assert.deepEqual(report.entries[0].events.map((e) => e.status), ['applied']);
    assert.deepEqual(await A.getApplicationDatesInMonth(db, 2026, 10), ['2026-10-24']);
  });

  test('abgeschickt im nächsten Monat: zählt dort, nicht im Monat des Vormerkens', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication({ appliedAt: '2026-10-30' }), 'saved');
    await A.addStatusEvent(db, id, { status: 'applied', date: '2026-11-02', note: null });
    assert.equal((await getReportData(db, '2026-10-01', '2026-10-31')).entries.length, 0);
    assert.equal((await getReportData(db, '2026-11-01', '2026-11-30')).entries.length, 1);
    assert.equal((await getReportData(db, '2026-11-01', '2026-11-30')).followUps.length, 0);
  });

  test('„Beworben“ lässt sich zurücknehmen, solange keine Rückmeldung da ist', async () => {
    const { db } = await makeDb();
    const id = await savedThenApplied(db);
    const events = await A.listStatusEvents(db, id);
    const first = await A.getFirstStatusEventId(db, id);
    const applied = events.find((e) => e.status === 'applied')!;
    assert.equal(A.isRemovable(applied, events, first), true);

    await A.deleteStatusEvent(db, id, applied.id);
    assert.deepEqual(await statusAndDate(db, id), { status: 'saved', appliedAt: '2026-10-22' });
  });

  test('mit Rückmeldung bleibt „Beworben“ stehen, auch in der Datenbank', async () => {
    const { db } = await makeDb();
    const id = await savedThenApplied(db);
    await A.addStatusEvent(db, id, { status: 'confirmed', date: '2026-10-25', note: null });
    const events = await A.listStatusEvents(db, id);
    const applied = events.find((e) => e.status === 'applied')!;
    assert.equal(A.isRemovable(applied, events, await A.getFirstStatusEventId(db, id)), false);

    await A.deleteStatusEvent(db, id, applied.id);
    assert.equal((await A.listStatusEvents(db, id)).length, 3);
    assert.deepEqual(await statusAndDate(db, id), { status: 'confirmed', appliedAt: '2026-10-24' });
  });

  test('Bearbeiten verschiebt „Beworben“; „Vorgemerkt“ rückt notfalls mit', async () => {
    const { db } = await makeDb();
    const id = await savedThenApplied(db);
    await A.updateApplication(db, id, newApplication({ appliedAt: '2026-10-20' }));
    assert.deepEqual(
      (await A.listStatusEvents(db, id)).map((e) => [e.status, e.date]),
      [['applied', '2026-10-20'], ['saved', '2026-10-20']],
    );
    assert.equal((await A.getApplication(db, id))?.appliedAt, '2026-10-20');
  });

  test('frühestes Folgedatum zählt nur Rückmeldungen', async () => {
    const { db } = await makeDb();
    const id = await savedThenApplied(db);
    assert.equal(await A.getEarliestFollowUpDate(db, id), null);
    await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-28', note: null });
    assert.equal(await A.getEarliestFollowUpDate(db, id), '2026-10-28');
  });

  test('übersteht Sicherung und Wiederherstellung, Datum aus „Beworben“', async () => {
    const a = await makeDb();
    const saved = await A.createApplication(a.db, newApplication({ company: 'Gemerkt', appliedAt: '2026-10-22' }), 'saved');
    const sent = await savedThenApplied(a.db);

    const b = await makeDb();
    await restoreBackup(b.db, parseBackup(JSON.stringify(await buildBackup(a.db))));
    assert.deepEqual(await statusAndDate(b.db, saved), { status: 'saved', appliedAt: '2026-10-22' });
    assert.deepEqual(await statusAndDate(b.db, sent), { status: 'applied', appliedAt: '2026-10-24' });
  });
});
