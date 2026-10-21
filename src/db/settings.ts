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
    const parsed: unknown = JSON.parse(raw);
    const source = typeof parsed === 'object' && parsed !== null ? parsed : {};
    // Nur Texte übernehmen; fehlende oder falsche Felder werden zu Leerwerten.
    // So kann ein kaputter Eintrag später nichts zum Absturz bringen.
    const profile = { ...EMPTY_PROFILE };
    for (const key of Object.keys(EMPTY_PROFILE) as (keyof Profile)[]) {
      const value = (source as Record<string, unknown>)[key];
      if (typeof value === 'string') profile[key] = value;
    }
    return profile;
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

// ── Darstellung ─────────────────────────────────────────────────────

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type Appearance = (typeof APPEARANCES)[number];

/** Hell, dunkel oder wie das Handy; unbekannte Werte gelten als „wie das Handy“. */
export async function getAppearance(db: SQLiteDatabase): Promise<Appearance> {
  const value = await getSetting(db, 'appearance');
  return APPEARANCES.find((a) => a === value) ?? 'system';
}

export async function saveAppearance(db: SQLiteDatabase, appearance: Appearance): Promise<void> {
  await setSetting(db, 'appearance', appearance);
}
