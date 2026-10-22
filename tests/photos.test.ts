import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as A from '@/db/applications';
import * as P from '@/db/photos';
import { buildBackup, parseBackup, restoreBackup } from '@/features/backup/backup';

import { makeDb, newApplication } from './helpers/db';

describe('Fotos', () => {
  test('gehören zu ihrer Bewerbung, in der Reihenfolge der Aufnahme', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication({ company: 'A' }));
    const b = await A.createApplication(db, newApplication({ company: 'B' }));
    await P.addPhotos(db, a, ['1.jpg', '2.jpg']);
    await P.addPhotos(db, b, ['3.jpg']);

    assert.deepEqual((await P.listPhotos(db, a)).map((p) => p.fileName), ['1.jpg', '2.jpg']);
    const [first] = await P.listPhotos(db, a);
    assert.equal((await P.getPhoto(db, first.id))?.applicationId, a);
  });

  test('verschwinden mit der Bewerbung; die Dateien gelten dann als Reste', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication());
    const b = await A.createApplication(db, newApplication());
    await P.addPhotos(db, a, ['weg.jpg']);
    await P.addPhotos(db, b, ['bleibt.jpg']);
    await A.deleteApplication(db, a);

    const known = await P.listPhotoFileNames(db);
    assert.deepEqual(known, ['bleibt.jpg']);
    assert.deepEqual(P.orphanFileNames(['weg.jpg', 'bleibt.jpg', 'verworfen.jpg'], known), [
      'weg.jpg',
      'verworfen.jpg',
    ]);
  });

  test('einzeln löschen', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication());
    await P.addPhotos(db, a, ['1.jpg', '2.jpg']);
    const [first] = await P.listPhotos(db, a);
    await P.deletePhoto(db, first.id);
    assert.deepEqual((await P.listPhotos(db, a)).map((p) => p.fileName), ['2.jpg']);
  });

  test('gleicher Dateiname zweimal geht nicht, auch nicht halb', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication());
    await P.addPhotos(db, a, ['1.jpg']);
    await assert.rejects(P.addPhotos(db, a, ['2.jpg', '1.jpg']));
    assert.deepEqual(await P.listPhotoFileNames(db), ['1.jpg']);
  });

  test('sind nicht in der Sicherung; Wiederherstellen leert die Liste', async () => {
    const { db } = await makeDb();
    const a = await A.createApplication(db, newApplication());
    await P.addPhotos(db, a, ['1.jpg']);
    const text = JSON.stringify(await buildBackup(db));
    assert.ok(!text.includes('1.jpg'));

    await restoreBackup(db, parseBackup(text));
    assert.deepEqual(await P.listPhotoFileNames(db), []);
  });
});
