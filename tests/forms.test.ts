import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as R from '@/db/recipients';
import { getProfile, saveProfile } from '@/db/settings';
import {
  applicationFormSchema,
  emptyFormValues,
  toNewApplication,
} from '@/features/application-form/schema';
import {
  emptyRecipientValues,
  profileSchema,
  recipientSchema,
  toNewRecipient,
} from '@/features/settings/schemas';
import { EMPTY_PROFILE } from '@/types/profile';

import { makeDb } from './helpers/db';

/** Erste Fehlermeldung oder null, wenn alles passt. */
function firstError(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, value: unknown) {
  const r = schema.safeParse(value);
  return r.success ? null : r.error!.issues[0].message;
}

describe('Formular „Bewerbung“', () => {
  const valid = { ...emptyFormValues(), company: 'Muster GmbH', position: 'Entwickler' };

  test('gültige Eingabe', () => assert.equal(firstError(applicationFormSchema, valid), null));

  test('Pflichtfelder mit verständlicher Meldung', () => {
    assert.equal(firstError(applicationFormSchema, { ...valid, company: '   ' }), 'Bitte die Firma eintragen');
    assert.equal(firstError(applicationFormSchema, { ...valid, position: '' }), 'Bitte die Stelle eintragen');
  });

  test('Datum: Format und nicht in der Zukunft', () => {
    assert.equal(firstError(applicationFormSchema, { ...valid, appliedAt: '20.10.2026' }), 'Bitte ein Datum wählen');
    assert.equal(firstError(applicationFormSchema, { ...valid, appliedAt: '2999-01-01' }), 'Das Datum liegt in der Zukunft');
  });

  test('E-Mail: leer erlaubt, Leerzeichen am Rand egal, unvollständig abgelehnt', () => {
    assert.equal(firstError(applicationFormSchema, { ...valid, contactEmail: '' }), null);
    const trimmed = applicationFormSchema.safeParse({ ...valid, contactEmail: ' jobs@muster.de ' });
    assert.ok(trimmed.success && trimmed.data.contactEmail === 'jobs@muster.de');
    assert.match(firstError(applicationFormSchema, { ...valid, contactEmail: 'abc@' }) ?? '', /nicht vollständig/);
  });

  test('Längen und erlaubte Werte', () => {
    assert.equal(firstError(applicationFormSchema, { ...valid, notes: 'x'.repeat(2001) }), 'Höchstens 2000 Zeichen');
    assert.equal(firstError(applicationFormSchema, { ...valid, channel: 'fax' }), 'Bitte den Bewerbungsweg wählen');
  });

  test('leere optionale Felder werden zu null', () => {
    const app = toNewApplication({ ...valid, company: ' Muster GmbH ', location: '  ' });
    assert.equal(app.company, 'Muster GmbH');
    assert.equal(app.location, null);
  });
});

describe('Formular „Stelle“', () => {
  const v = (o: object) => recipientSchema.safeParse({ ...emptyRecipientValues(), ...o });

  test('ohne Anschrift gültig, halbe Anschrift meldet die fehlenden Teile', () => {
    assert.ok(v({}).success);
    const half = v({ street: 'Str. 1' });
    if (half.success) assert.fail('halbe Anschrift wurde akzeptiert');
    assert.deepEqual(half.error.issues.map((i) => i.path[0]).sort(), ['city', 'zip']);
  });

  test('Postleitzahl hat fünf Ziffern, Name ist Pflicht', () => {
    assert.ok(!v({ street: 'S', zip: '1234', city: 'K' }).success);
    assert.ok(!v({ name: ' ' }).success);
  });

  test('BG-Nummer gibt es nur beim Jobcenter', () => {
    assert.equal(toNewRecipient({ ...emptyRecipientValues(), bgNumber: '1' }).bgNumber, null);
    assert.equal(toNewRecipient({ ...emptyRecipientValues(), kind: 'jobcenter', bgNumber: '1' }).bgNumber, '1');
  });

  test('Datenbank speichert, ändert und löscht Stellen', async () => {
    const { db } = await makeDb();
    const id = await R.createRecipient(db, { kind: 'agentur', name: 'Agentur', customerNumber: null, bgNumber: 'soll weg', contactPerson: null, street: null, zip: null, city: null });
    assert.equal((await R.getRecipient(db, id))?.bgNumber, null);
    await R.updateRecipient(db, id, { kind: 'jobcenter', name: 'Jobcenter', customerNumber: '1', bgNumber: '2', contactPerson: null, street: null, zip: null, city: null });
    assert.equal((await R.getRecipient(db, id))?.bgNumber, '2');
    await R.deleteRecipient(db, id);
    assert.deepEqual(await R.listRecipients(db), []);
  });
});

describe('Deine Angaben', () => {
  test('alle Felder optional, E-Mail wird geprüft', () => {
    assert.ok(profileSchema.safeParse(EMPTY_PROFILE).success);
    assert.ok(!profileSchema.safeParse({ ...EMPTY_PROFILE, email: 'x@' }).success);
  });

  test('Speichern kürzt Leerzeichen, Lesen übersteht kaputte Einträge', async () => {
    const { db, raw } = await makeDb();
    await saveProfile(db, { ...EMPTY_PROFILE, name: ' Anatolij ' });
    assert.equal((await getProfile(db)).name, 'Anatolij');

    raw.exec(`UPDATE settings SET value = '{"name":{"boese":true},"city":"Köln"}' WHERE key = 'profile'`);
    assert.deepEqual(await getProfile(db), { ...EMPTY_PROFILE, city: 'Köln' });

    raw.exec(`UPDATE settings SET value = 'kein json' WHERE key = 'profile'`);
    assert.deepEqual(await getProfile(db), EMPTY_PROFILE);
  });
});
