/**
 * Echte SQLite-Datenbank für Tests, ohne Handy.
 *
 * Node bringt SQLite mit (node:sqlite). Dieser kleine Adapter bietet die
 * Methoden an, die unser Code von expo-sqlite benutzt. So testen wir genau
 * die SQL-Abfragen und Migrationen, die auch in der App laufen.
 */
import { DatabaseSync } from 'node:sqlite';

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/schema';
import type { NewApplication } from '@/types/application';

type Param = string | number | null;

/** expo-sqlite erlaubt Parameter einzeln oder als ein Array. */
function flatten(params: unknown[]): Param[] {
  return (params.length === 1 && Array.isArray(params[0]) ? params[0] : params) as Param[];
}

export type TestDb = { db: SQLiteDatabase; raw: DatabaseSync };

/** Leere Datenbank ohne Schema, z. B. um alte Versionen nachzubauen. */
export function makeRawDb(): TestDb {
  const raw = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      const r = raw.prepare(sql).run(...flatten(params));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    getAllAsync: async (sql: string, ...params: unknown[]) =>
      raw.prepare(sql).all(...flatten(params)),
    getFirstAsync: async (sql: string, ...params: unknown[]) =>
      raw.prepare(sql).get(...flatten(params)) ?? null,
    withTransactionAsync: async (fn: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { db, raw };
}

/** Datenbank mit aktuellem Schema. */
export async function makeDb(): Promise<TestDb> {
  const test = makeRawDb();
  await migrateDbIfNeeded(test.db);
  return test;
}

export function userVersion(raw: DatabaseSync): number {
  return (raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
}

/** Bewerbung mit sinnvollen Vorgaben; nur das Nötige überschreiben. */
export function newApplication(over: Partial<NewApplication> = {}): NewApplication {
  return {
    company: 'Muster GmbH',
    position: 'Entwickler',
    appliedAt: '2026-10-01',
    channel: 'email',
    source: 'own',
    location: null,
    contactName: null,
    contactEmail: null,
    jobUrl: null,
    notes: null,
    ...over,
  };
}
