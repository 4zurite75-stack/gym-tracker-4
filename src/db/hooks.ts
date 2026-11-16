import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Exercise, Routine } from './types';

const collator = new Intl.Collator('es', { sensitivity: 'base' });
export const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);

/** Todos los ejercicios (incluidos borrados) indexados por id. */
export function useExerciseMap(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  return new Map(list.map((e) => [e.id, e]));
}

export function useLibrary(): Exercise[] | undefined {
  return useLiveQuery(async () => (await db.exercises.toArray()).filter((e) => !e.deletedAt).sort(byName), []);
}

export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(() => db.routines.orderBy('order').toArray(), []);
}

/** Normaliza para búsquedas sin tildes. */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
