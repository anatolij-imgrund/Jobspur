import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewRecipient, Recipient, RecipientKind } from '@/types/profile';

type RecipientRow = {
  id: number;
  kind: string;
  name: string;
  customer_number: string | null;
  bg_number: string | null;
  contact_person: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
};

function toRecipient(row: RecipientRow): Recipient {
  return {
    id: row.id,
    kind: row.kind as RecipientKind,
    name: row.name,
    customerNumber: row.customer_number,
    bgNumber: row.bg_number,
    contactPerson: row.contact_person,
    street: row.street,
    zip: row.zip,
    city: row.city,
  };
}

export async function listRecipients(db: SQLiteDatabase): Promise<Recipient[]> {
  const rows = await db.getAllAsync<RecipientRow>('SELECT * FROM recipients ORDER BY id');
  return rows.map(toRecipient);
}

export async function getRecipient(db: SQLiteDatabase, id: number): Promise<Recipient | null> {
  const row = await db.getFirstAsync<RecipientRow>('SELECT * FROM recipients WHERE id = ?', id);
  return row ? toRecipient(row) : null;
}

function values(r: NewRecipient) {
  // Die BG-Nummer gibt es nur beim Jobcenter.
  const bg = r.kind === 'jobcenter' ? r.bgNumber : null;
  return [r.kind, r.name, r.customerNumber, bg, r.contactPerson, r.street, r.zip, r.city] as const;
}

export async function createRecipient(db: SQLiteDatabase, r: NewRecipient): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO recipients
       (kind, name, customer_number, bg_number, contact_person, street, zip, city)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ...values(r),
  );
  return result.lastInsertRowId;
}

export async function updateRecipient(
  db: SQLiteDatabase,
  id: number,
  r: NewRecipient,
): Promise<void> {
  await db.runAsync(
    `UPDATE recipients SET
       kind = ?, name = ?, customer_number = ?, bg_number = ?, contact_person = ?,
       street = ?, zip = ?, city = ?
     WHERE id = ?`,
    ...values(r),
    id,
  );
}

export async function deleteRecipient(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recipients WHERE id = ?', id);
}
