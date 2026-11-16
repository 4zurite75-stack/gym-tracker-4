import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export interface Settings {
  defaultRestSec: number;
  weightIncrement: number;
  keepAwake: boolean;
  restSound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultRestSec: 120,
  weightIncrement: 2.5,
  keepAwake: true,
  restSound: true,
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return s as unknown as Settings;
}

export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULT_SETTINGS);
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value });
}
