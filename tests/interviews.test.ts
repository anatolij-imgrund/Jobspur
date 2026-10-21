import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as A from '@/db/applications';
import { reminderSlots } from '@/features/reminders/reminderTimes';
import {
  daysSince,
  formatDaysAgo,
  formatWeekdayDate,
  presetRange,
  toIsoDate,
  toLocalDateTime,
} from '@/lib/dates';

import { makeDb, newApplication } from './helpers/db';

const TODAY = '2026-10-21';
/** Datum in Ortszeit als „YYYY-MM-DD HH:MM“, damit Tests in jeder Zeitzone gelten. */
const local = (d: Date) => `${toIsoDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('Gesprächstermine in der Datenbank', () => {
  test('Termin mit Uhrzeit, Art und Erinnerungen wird gespeichert', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    const { eventId } = await A.addStatusEvent(db, id, {
      status: 'interview', date: '2026-11-05', note: null, time: '10:00', mode: 'video',
    });
    await A.setReminderIds(db, eventId, ['n1', 'n2']);

    const [event] = await A.listStatusEvents(db, id);
    assert.deepEqual(
      [event.status, event.time, event.mode, event.reminderIds],
      ['interview', '10:00', 'video', ['n1', 'n2']],
    );
    assert.equal((await A.getApplication(db, id))?.status, 'interview');
  });

  test('Uhrzeit und Art gibt es nur bei Gesprächen', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    await A.addStatusEvent(db, id, { status: 'confirmed', date: '2026-10-02', note: null, time: '09:00', mode: 'phone' });
    const [event] = await A.listStatusEvents(db, id);
    assert.deepEqual([event.time, event.mode], [null, null]);
  });

  test('Liste und „Nächste Termine“ kennen das kommende Gespräch', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication({ company: 'Muster' }));
    await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-20', note: null, time: null, mode: 'onsite' });
    const next = await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-28', note: null, time: '14:30', mode: 'onsite' });

    const [row] = await A.listApplications(db, { today: TODAY });
    assert.deepEqual(row.nextInterview, { date: '2026-10-28', time: '14:30' });
    assert.equal((await A.listApplications(db))[0].nextInterview, null, 'ohne today kein Termin');
    assert.deepEqual((await A.listUpcomingInterviews(db, TODAY)).map((u) => u.event.id), [next.eventId]);
  });

  test('Absage vor dem Termin entfernt ihn und gibt seine Erinnerungen zurück', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    const { eventId } = await A.addStatusEvent(db, id, { status: 'interview', date: '2026-11-05', note: null, time: '10:00', mode: 'video' });
    await A.setReminderIds(db, eventId, ['n1', 'n2']);

    const result = await A.addStatusEvent(db, id, { status: 'rejected', date: TODAY, note: null }, { dropLaterInterviews: true });

    assert.deepEqual(result.cancelledReminderIds, ['n1', 'n2']);
    assert.equal((await A.getApplication(db, id))?.status, 'rejected');
    assert.equal((await A.listUpcomingInterviews(db, TODAY)).length, 0);
  });

  test('Löschen von Termin oder Bewerbung gibt die Erinnerungen zum Absagen zurück', async () => {
    const { db } = await makeDb();
    const id = await A.createApplication(db, newApplication());
    const a = await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-28', note: null, time: '11:00', mode: 'video' });
    await A.setReminderIds(db, a.eventId, ['x1']);
    assert.deepEqual(await A.deleteStatusEvent(db, id, a.eventId), ['x1']);

    const b = await A.addStatusEvent(db, id, { status: 'interview', date: '2026-10-30', note: null, time: '11:00', mode: 'video' });
    await A.setReminderIds(db, b.eventId, ['y1', 'y2']);
    assert.deepEqual(await A.deleteApplication(db, id), ['y1', 'y2']);
  });
});

describe('Erinnerungszeiten', () => {
  const now = new Date(2026, 9, 21, 12, 0); // 21.10.2026, 12:00 Uhr

  test('mit Uhrzeit: Vorabend 18 Uhr und eine Stunde vorher', () => {
    const slots = reminderSlots('2026-11-05', '10:00', now);
    assert.deepEqual(slots.map((s) => [s.kind, local(s.at)]), [
      ['eveningBefore', '2026-11-04 18:00'],
      ['hourBefore', '2026-11-05 09:00'],
    ]);
  });

  test('ohne Uhrzeit: Vorabend und 8 Uhr am Tag', () => {
    const slots = reminderSlots('2026-11-05', null, now);
    assert.deepEqual(slots.map((s) => [s.kind, local(s.at)]), [
      ['eveningBefore', '2026-11-04 18:00'],
      ['morningOf', '2026-11-05 08:00'],
    ]);
  });

  test('vergangene Zeitpunkte fallen weg', () => {
    assert.deepEqual(reminderSlots('2026-10-21', '16:00', now).map((s) => local(s.at)), ['2026-10-21 15:00']);
    assert.equal(reminderSlots('2026-10-21', '12:30', now).length, 0);
  });

  test('über den Monatswechsel', () => {
    assert.deepEqual(reminderSlots('2026-11-01', '10:00', now).map((s) => local(s.at)), [
      '2026-10-31 18:00',
      '2026-11-01 09:00',
    ]);
  });
});

describe('Datumshilfen', () => {
  test('Wochentag, Ortszeit, Tage seit', () => {
    assert.equal(formatWeekdayDate('2026-11-05'), 'Do, 05.11.');
    assert.equal(formatWeekdayDate('2026-10-25'), 'So, 25.10.');
    assert.equal(toIsoDate(toLocalDateTime('2026-03-29', '02:30')), '2026-03-29');
    assert.equal(daysSince(toIsoDate(new Date())), 0);
    assert.deepEqual([formatDaysAgo(0), formatDaysAgo(1), formatDaysAgo(12)], ['heute', 'gestern', 'vor 12 Tagen']);
  });

  test('Zeiträume für den Nachweis', () => {
    const march15 = new Date(2026, 2, 15);
    assert.deepEqual(presetRange('thisMonth', march15), { from: '2026-03-01', to: '2026-03-15' });
    assert.deepEqual(presetRange('lastMonth', march15), { from: '2026-02-01', to: '2026-02-28' });
    assert.deepEqual(presetRange('lastMonth', new Date(2026, 0, 10)), { from: '2025-12-01', to: '2025-12-31' });
    assert.deepEqual(presetRange('last4Weeks', march15), { from: '2026-02-16', to: '2026-03-15' });
  });
});
