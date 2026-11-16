import Dexie, { type EntityTable } from 'dexie';
import type { BodyMetric, Exercise, Photo, Routine, SettingRow, Workout } from './types';
import { seedExercises } from './seed';

export class GymDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  bodyMetrics!: EntityTable<BodyMetric, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor() {
    super('gym-tracker');
    this.version(1).stores({
      exercises: 'id, name, primary, deletedAt',
      routines: 'id, order',
      workouts: 'id, startedAt, status, *exerciseIds',
      bodyMetrics: 'id, date',
      photos: 'id, date, angle',
      settings: 'key',
    });
    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(seedExercises());
    });
  }
}

export const db = new GymDB();

/** Pide a iOS/Safari que no borre los datos de la app. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
