import type { SQLiteDatabase } from 'expo-sqlite';

import { EMPTY_PROFILE, type Profile } from '@/types/profile';

async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const raw = await getSetting(db, 'profile');
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    // Fehlende Felder aus älteren Versionen mit Leerwerten auffüllen.
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveProfile(db: SQLiteDatabase, profile: Profile): Promise<void> {
  const trimmed = Object.fromEntries(
    Object.entries(profile).map(([k, v]) => [k, String(v).trim()]),
  ) as Profile;
  await setSetting(db, 'profile', JSON.stringify(trimmed));
}
