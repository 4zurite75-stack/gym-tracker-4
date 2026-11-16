import type { Exercise, Muscle, Workout, WorkoutExercise, WorkoutSet } from '../db/types';
import { e1rm, exerciseStats, isWorkingDone, type ExerciseSessionStats } from './calc';

export type PRType = 'e1rm' | 'maxWeight' | 'setVolume' | 'maxReps';

export const PR_LABEL: Record<PRType, string> = {
  e1rm: '1RM estimado',
  maxWeight: 'Peso máximo',
  setVolume: 'Mejor serie (kg × reps)',
  maxReps: 'Más repeticiones',
};

const PR_PRIORITY: PRType[] = ['e1rm', 'maxWeight', 'setVolume', 'maxReps'];

export interface Bests {
  maxWeight: number;
  e1rm: number;
  setVolume: number;
  maxReps: number;
  sessions: number;
}

export const emptyBests = (): Bests => ({ maxWeight: 0, e1rm: 0, setVolume: 0, maxReps: 0, sessions: 0 });

const EPS = 1e-6;

/** Qué récords bate una serie respecto a `b`. Sin historial previo no hay récords. */
export function prTypes(b: Bests, s: WorkoutSet): PRType[] {
  if (b.sessions === 0 || !isWorkingDone(s)) return [];
  const w = s.weight ?? 0;
  const out: PRType[] = [];
  if (w > 0) {
    if (e1rm(s.weight, s.reps, s.rir) > b.e1rm + EPS) out.push('e1rm');
    if (w > b.maxWeight + EPS) out.push('maxWeight');
    if (w * (s.reps ?? 0) > b.setVolume + EPS) out.push('setVolume');
  } else if ((s.reps ?? 0) > b.maxReps) out.push('maxReps');
  return out;
}

export function updateBests(b: Bests, s: WorkoutSet) {
  if (!isWorkingDone(s)) return;
  const w = s.weight ?? 0;
  b.maxWeight = Math.max(b.maxWeight, w);
  b.e1rm = Math.max(b.e1rm, e1rm(s.weight, s.reps, s.rir));
  b.setVolume = Math.max(b.setVolume, w * (s.reps ?? 0));
  if (w === 0) b.maxReps = Math.max(b.maxReps, s.reps ?? 0);
}

export function topPR(types: PRType[]): PRType | undefined {
  return PR_PRIORITY.find((t) => types.includes(t));
}

/** Mejores marcas de un ejercicio a partir de entrenos terminados. */
export function bestsFrom(workouts: Workout[], exerciseId: string): Bests {
  const b = emptyBests();
  for (const w of workouts) {
    let had = false;
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (isWorkingDone(s)) had = true;
        updateBests(b, s);
      }
    }
    if (had) b.sessions++;
  }
  return b;
}

/** Recorre todo el historial en orden y marca qué series fueron récord en su momento. */
export function allPRs(workoutsAsc: Workout[]): Map<string, PRType[]> {
  const bests = new Map<string, Bests>();
  const out = new Map<string, PRType[]>();
  for (const w of workoutsAsc) {
    const touched = new Set<string>();
    for (const ex of w.exercises) {
      let b = bests.get(ex.exerciseId);
      if (!b) bests.set(ex.exerciseId, (b = emptyBests()));
      for (const s of ex.sets) {
        const t = prTypes(b, s);
        if (t.length) out.set(s.id, t);
        if (isWorkingDone(s)) touched.add(ex.exerciseId);
        // Cada serie se compara con el historial y con las series anteriores del mismo día.
        updateBests(b, s);
      }
    }
    // Sin sesiones previas no hay récords: la primera vez que haces un ejercicio no cuenta.
    for (const id of touched) bests.get(id)!.sessions++;
  }
  return out;
}

export interface SessionPoint {
  workout: Workout;
  ex: WorkoutExercise;
  stats: ExerciseSessionStats;
}

export function exerciseHistory(workoutsAsc: Workout[], exerciseId: string): SessionPoint[] {
  const out: SessionPoint[] = [];
  for (const w of workoutsAsc) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId);
    if (!sets.length) continue;
    const merged: WorkoutExercise = { ...sets[0], sets: sets.flatMap((e) => e.sets) };
    const stats = exerciseStats(merged);
    if (stats.workingSets > 0) out.push({ workout: w, ex: merged, stats });
  }
  return out;
}

export interface RecordEntry {
  type: PRType;
  value: number;
  set: WorkoutSet;
  date: number;
}

export function recordsFor(history: SessionPoint[]): RecordEntry[] {
  const best: Partial<Record<PRType, RecordEntry>> = {};
  const consider = (type: PRType, value: number, set: WorkoutSet, date: number) => {
    if (value <= 0) return;
    const cur = best[type];
    if (!cur || value > cur.value + EPS) best[type] = { type, value, set, date };
  };
  for (const h of history) {
    for (const s of h.ex.sets) {
      if (!isWorkingDone(s)) continue;
      const w = s.weight ?? 0;
      if (w > 0) {
        consider('e1rm', e1rm(s.weight, s.reps, s.rir), s, h.workout.startedAt);
        consider('maxWeight', w, s, h.workout.startedAt);
        consider('setVolume', w * (s.reps ?? 0), s, h.workout.startedAt);
      } else consider('maxReps', s.reps ?? 0, s, h.workout.startedAt);
    }
  }
  return PR_PRIORITY.map((t) => best[t]).filter(Boolean) as RecordEntry[];
}

/** Lunes 00:00 de la semana de `t`. */
export function weekStart(t: number | Date): number {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
}

export function addWeeks(t: number, n: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7).getTime();
}

/** Series efectivas por músculo: 1 para el principal y 0,5 para cada secundario. */
export function muscleSets(workouts: Workout[], exMap: Map<string, Exercise>): Map<Muscle, number> {
  const out = new Map<Muscle, number>();
  const add = (m: Muscle, n: number) => out.set(m, (out.get(m) ?? 0) + n);
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const def = exMap.get(ex.exerciseId);
      if (!def) continue;
      const n = ex.sets.filter(isWorkingDone).length;
      if (!n) continue;
      add(def.primary, n);
      for (const m of def.secondary) if (m !== def.primary) add(m, n * 0.5);
    }
  }
  return out;
}

export function inRange(workouts: Workout[], from: number, to: number): Workout[] {
  return workouts.filter((w) => w.startedAt >= from && w.startedAt < to);
}
