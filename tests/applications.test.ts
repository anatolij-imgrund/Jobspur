import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as A from '@/db/applications';
import { insertSampleData } from '@/db/seed';
import { isFinal, NEXT_STATUSES, STATUSES } from '@/types/application';

import { makeDb, newApplication } from './helpers/db';

const statuses = async (db: Awaited<ReturnType<typeof makeDb>>['db'], id: number) =>
  (await A.listStatusEvents(db, id)).map((e) => e.status);

describe('Bewerbungen und Verlauf', () => {
  test('neue Bewerbung beginnt immer mit „Beworben“', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    assert.equal((await A.getApplication(db, id))?.status, 'applied');
    assert.deepEqual(await statuses(db, id), ['applied']);
  });

  test('aktueller Status folgt dem jüngsten Eintrag', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-10', note: null });
    // nachträglich eingetragener älterer Eintrag ändert den Status nicht
    await A.addStatusEvent(db, id, { status: 'confirmed', date: '2026-10-03', note: null });
    assert.equal((await A.getApplication(db, id))?.status, 'interview');
    assert.deepEqual(await statuses(db, id), ['interview', 'confirmed', 'applied']);
  });

  test('bei gleichem Datum gewinnt der später eingetragene', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-10', note: null });
    await A.addStatusEvent(db, id, { status: 'offer', date: '2026-10-10', note: null });
    assert.equal((await A.getApplication(db, id))?.status, 'offer');
  });

  test('Eintrag löschen setzt den Status zurück, „Beworben“ bleibt stehen', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-10', note: null });
    const { eventId } = await A.addStatusEvent(db, id, { status: 'rejected', date: '2026-10-12', note: null });

    await A.deleteStatusEvent(db, id, eventId);
    assert.equal((await A.getApplication(db, id))?.status, 'interview');

    const first = await A.getFirstStatusEventId(db, id);
    await A.deleteStatusEvent(db, id, first!);
    assert.deepEqual(await statuses(db, id), ['interview', 'applied']);
  });

  test('Bearbeiten verschiebt den ersten Eintrag mit dem Bewerbungsdatum', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    await A.addStatusEvent(db, id, { status: 'confirmed', date: '2026-10-05', note: null });
    await A.updateApplication(db, id, newApplication({ company: 'Neu', appliedAt: '2026-09-28' }));

    const app = await A.getApplication(db, id);
    assert.equal(app?.company, 'Neu');
    assert.equal(app?.status, 'confirmed');
    assert.equal((await A.listStatusEvents(db, id)).at(-1)?.date, '2026-09-28');
    assert.equal(await A.getEarliestFollowUpDate(db, id), '2026-10-05');
  });

  test('Löschen entfernt Bewerbung samt Verlauf', async () => {
    const { db, raw } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    const other = await A.createApplication(db, newApplication({ company: 'Bleibt' }));
    await A.deleteApplication(db, id);
    assert.equal(await A.getApplication(db, id), null);
    const left = raw.prepare('SELECT COUNT(*) AS n FROM status_events WHERE application_id = ?').get(id) as { n: number };
    assert.equal(left.n, 0);
    assert.equal((await A.getApplication(db, other))?.company, 'Bleibt');
  });

  test('Liste: Suche, Statusfilter und Daten im Monat', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication({ company: 'Alpha', appliedAt: '2026-10-02' }));
    await A.createApplication(db, newApplication({ company: 'Beta', appliedAt: '2026-11-01', location: 'Köln' }));
    await A.addStatusEvent(db, a, { status: 'interview', date: '2026-10-05', note: null });

    assert.deepEqual((await A.listApplications(db, { search: 'köln' })).map((x) => x.company), ['Beta']);
    assert.deepEqual((await A.listApplications(db, { status: 'interview' })).map((x) => x.company), ['Alpha']);
    assert.deepEqual(await A.getApplicationDatesInMonth(db, 2026, 10), ['2026-10-02']);
    assert.equal(await A.countApplications(db), 2);
  });

  test('Suche mit Sonderzeichen wie in SQL bleibt harmlos', async () => {
    const { db } = await makeDb();
    await A.createApplication(db, newApplication({ company: "x'); DROP TABLE applications; --" }));
    const found = await A.listApplications(db, { search: "'); DROP" });
    assert.equal(found.length, 1);
    assert.equal(await A.countApplications(db), 1);
  });

  test('Beispieldaten haben einen Verlauf wie echte Bewerbungen', async () => {
    const { db } = await makeDb();
    await insertSampleData(db);
    for (const app of await A.listApplications(db)) {
      const events = await A.listStatusEvents(db, app.id);
      assert.ok(['applied', 'saved'].includes(events.at(-1)!.status), `${app.company} beginnt mit „Beworben“ oder „Vorgemerkt“`);
      assert.equal(events[0].status, app.status, `${app.company}: Status passt zum Verlauf`);
    }
  });
});

describe('Statusübergänge', () => {
  test('Absage und Zusage sind Endzustände', () => {
    for (const s of STATUSES) assert.equal(isFinal(s), NEXT_STATUSES[s].length === 0, s);
  });

  test('„Beworben“ nur nach „Vorgemerkt“, nur Gespräch darf sich wiederholen', () => {
    assert.deepEqual(NEXT_STATUSES.saved, ['applied']);
    for (const s of STATUSES) {
      if (s !== 'saved') assert.ok(!NEXT_STATUSES[s].includes('applied'), s);
      assert.ok(!NEXT_STATUSES[s].includes('saved'), `zurück zu „Vorgemerkt“ nach ${s}`);
      if (s !== 'interview') assert.ok(!NEXT_STATUSES[s].includes(s), s);
    }
    assert.ok(NEXT_STATUSES.interview.includes('interview'), 'Zweitgespräch');
    assert.ok(!NEXT_STATUSES.interview.includes('confirmed'), 'kein Eingang nach Gespräch');
  });
});
