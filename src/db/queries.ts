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
