import { bestsFrom, type Bests } from '../lib/stats';
import { db } from './db';
import type { Workout, WorkoutExercise } from './types';

export interface PrevSession {
  workout: Workout;
  exercise: WorkoutExercise;
}

/** Última sesión terminada (anterior a `before`) en la que se hizo el ejercicio. */
export async function previousSession(exerciseId: string, before: number, excludeId?: string): Promise<PrevSession | null> {
  const ws = await db.workouts.where('exerciseIds').equals(exerciseId).toArray();
  const done = ws
    .filter((w) => w.status === 'done' && w.id !== excludeId && w.startedAt < before)
    .sort((a, b) => b.startedAt - a.startedAt);
  for (const w of done) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done));
    if (ex) return { workout: w, exercise: ex };
  }
  return null;
}

export async function activeWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('active').first();
}

/** Mejores marcas de un ejercicio en entrenos terminados antes de `before`. */
export async function bestsBefore(exerciseId: string, before: number, excludeId?: string): Promise<Bests> {
  const ws = await db.workouts.where('exerciseIds').equals(exerciseId).toArray();
  const done = ws.filter((w) => w.status === 'done' && w.id !== excludeId && w.startedAt < before).sort((a, b) => a.startedAt - b.startedAt);
  return bestsFrom(done, exerciseId);
}

export async function doneWorkoutsAsc(): Promise<Workout[]> {
  const ws = await db.workouts.orderBy('startedAt').toArray();
  return ws.filter((w) => w.status === 'done');
}
