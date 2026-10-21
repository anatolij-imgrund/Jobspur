import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as A from '@/db/applications';
import { getReportData } from '@/db/report';
import {
  escapeHtml,
  renderReport,
  reportFileName,
  reportStats,
} from '@/features/report/renderReport';
import { EMPTY_PROFILE, type Recipient } from '@/types/profile';

import { makeDb, newApplication } from './helpers/db';

const jobcenter: Recipient = {
  id: 1,
  kind: 'jobcenter',
  name: 'Jobcenter Köln',
  customerNumber: '123D456789',
  bgNumber: '36202//0012345',
  contactPerson: 'Herr Schmidt',
  street: 'Luxemburger Straße 121',
  zip: '50939',
  city: 'Köln',
};

async function octoberData() {
  const { db } = await makeDb();
  // Bewerbung aus dem September mit Gespräch im Oktober
  const old = await A.createApplication(db, newApplication({ company: 'Alt', appliedAt: '2026-09-22' }));
  await A.addStatusEvent(db, old, { status: 'interview', date: '2026-10-08', note: null });
  // Bewerbungen im Oktober, eine am Monatsrand, eine danach
  const b = await A.createApplication(db, newApplication({ company: 'B', appliedAt: '2026-10-10', source: 'referral' }));
  await A.addStatusEvent(db, b, { status: 'interview', date: '2026-10-20', note: null });
  await A.addStatusEvent(db, b, { status: 'interview', date: '2026-11-05', note: null });
  await A.createApplication(db, newApplication({ company: 'C', appliedAt: '2026-10-31' }));
  await A.createApplication(db, newApplication({ company: 'D', appliedAt: '2026-11-01' }));
  return getReportData(db, '2026-10-01', '2026-10-31');
}

describe('Nachweis: Daten', () => {
  test('nur Bewerbungen im Zeitraum, älteste zuerst, Ränder eingeschlossen', async () => {
    const data = await octoberData();
    assert.deepEqual(data.entries.map((e) => e.application.company), ['B', 'C']);
    assert.deepEqual(data.entries[0].events.map((e) => e.status), ['applied', 'interview', 'interview']);
  });

  test('Rückmeldungen zu früheren Bewerbungen erscheinen eigens', async () => {
    const data = await octoberData();
    assert.deepEqual(data.followUps.map((f) => `${f.application.company} ${f.event.status}`), ['Alt interview']);
  });

  test('Zahlen für Kopf und Vorschau', async () => {
    assert.deepEqual(reportStats(await octoberData()), {
      applications: 2,
      referrals: 1,
      interviews: 2,
      followUps: 1,
    });
  });
});

describe('Nachweis: PDF-Vorlage', () => {
  test('Brief mit Anschrift, Kundennummer, BG-Nummer und Unterschrift', async () => {
    const html = renderReport({
      data: await octoberData(),
      profile: { ...EMPTY_PROFILE, name: 'Anatolij Imgrund', city: 'Köln' },
      recipient: jobcenter,
      createdAt: '2026-10-31',
    });
    for (const part of ['Luxemburger Straße 121', '123D456789', '36202//0012345', 'Mit freundlichen Grüßen', 'Köln, 31.10.2026']) {
      assert.ok(html.includes(part), part);
    }
  });

  test('„Für mich“ ohne Nummern und Unterschrift', async () => {
    const html = renderReport({ data: await octoberData(), profile: EMPTY_PROFILE, recipient: null, createdAt: '2026-10-31' });
    assert.ok(html.includes('Bewerbungsübersicht'));
    assert.ok(!html.includes('Kundennummer'));
    assert.ok(!html.includes('Unterschrift'));
  });

  test('künftige Gespräche sind als „geplant“ markiert', async () => {
    const html = renderReport({ data: await octoberData(), profile: EMPTY_PROFILE, recipient: null, createdAt: '2026-10-21' });
    assert.ok(html.includes('Gespräch 20.10.<br>'));
    assert.ok(html.includes('Gespräch 05.11. (geplant)'));
  });

  test('Texte aus der Datenbank können kein HTML oder Skript einschleusen', async () => {
    const { db } = await makeDb();
    await A.createApplication(db, newApplication({ company: '<script>alert(1)</script>', position: 'A & B', appliedAt: '2026-10-05' }));
    const html = renderReport({
      data: await getReportData(db, '2026-10-01', '2026-10-31'),
      profile: { ...EMPTY_PROFILE, name: '<b>Name</b>' },
      recipient: null,
      createdAt: '2026-10-31',
    });
    assert.ok(!html.includes('<script>alert'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('A &amp; B'));
    assert.ok(!html.includes('<b>Name</b>'));
  });

  test('escapeHtml maskiert alle gefährlichen Zeichen', () => {
    assert.equal(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    assert.equal(escapeHtml(null), '');
  });

  test('Dateinamen ohne Umlaute', () => {
    assert.equal(reportFileName(null, '2026-10-01', '2026-10-31'), 'Bewerbungsuebersicht_2026-10-01_2026-10-31.pdf');
    assert.equal(reportFileName(jobcenter, '2026-10-01', '2026-10-31'), 'Nachweis_Eigenbemuehungen_2026-10-01_2026-10-31.pdf');
  });
});
