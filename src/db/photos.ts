import type { SQLiteDatabase } from 'expo-sqlite';

export type Photo = {
  id: number;
  applicationId: number;
  /** Dateiname im Foto-Ordner der App, z. B. 1729612345678-a1b2c3.jpg */
  fileName: string;
  createdAt: string;
};

type PhotoRow = { id: number; application_id: number; file_name: string; created_at: string };

const toPhoto = (r: PhotoRow): Photo => ({
  id: r.id,
  applicationId: r.application_id,
  fileName: r.file_name,
  createdAt: r.created_at,
});

/** Fotos einer Bewerbung, ältestes zuerst (so, wie sie aufgenommen wurden). */
export async function listPhotos(db: SQLiteDatabase, applicationId: number): Promise<Photo[]> {
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE application_id = ? ORDER BY id',
    applicationId,
  );
  return rows.map(toPhoto);
}

export async function getPhoto(db: SQLiteDatabase, id: number): Promise<Photo | null> {
  const row = await db.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', id);
  return row ? toPhoto(row) : null;
}

export async function addPhotos(
  db: SQLiteDatabase,
  applicationId: number,
  fileNames: readonly string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const fileName of fileNames) {
      await db.runAsync(
        'INSERT INTO photos (application_id, file_name) VALUES (?, ?)',
        applicationId,
        fileName,
      );
    }
  });
}

/** Entfernt den Eintrag; die Datei räumt removeOrphanPhotoFiles weg. */
export async function deletePhoto(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM photos WHERE id = ?', id);
}

/** Alle Dateinamen, die noch zu einer Bewerbung gehören. */
export async function listPhotoFileNames(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ file_name: string }>('SELECT file_name FROM photos');
  return rows.map((r) => r.file_name);
}

/**
 * Dateien im Foto-Ordner, zu denen es keinen Eintrag mehr gibt: von
 * gelöschten Bewerbungen, nach dem Wiederherstellen einer Sicherung oder
 * aus einem verworfenen Formular.
 */
export function orphanFileNames(filesOnDisk: readonly string[], known: readonly string[]): string[] {
  const keep = new Set(known);
  return filesOnDisk.filter((name) => !keep.has(name));
}
