import type { Exercise, Target, Workout, WorkoutExercise, WorkoutSet } from '../db/types';

/** 1RM estimado (Epley) contando las repeticiones en reserva: reps efectivas = reps + RIR. */
export function e1rm(weight: number | null, reps: number | null, rir: number | null = 0): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  const eff = reps + Math.max(0, rir ?? 0);
  if (eff <= 1) return weight;
  return weight * (1 + eff / 30);
}

export const isWorkingDone = (s: WorkoutSet) => s.done && s.type === 'working' && (s.reps ?? 0) > 0;

export function setVolume(s: WorkoutSet): number {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

export interface ExerciseSessionStats {
  workingSets: number;
  maxWeight: number;
  bestE1rm: number;
  volume: number;
  totalReps: number;
  bestSet?: WorkoutSet;
}

export function exerciseStats(ex: WorkoutExercise): ExerciseSessionStats {
  const st: ExerciseSessionStats = { workingSets: 0, maxWeight: 0, bestE1rm: 0, volume: 0, totalReps: 0 };
  for (const s of ex.sets) {
    if (!isWorkingDone(s)) continue;
    st.workingSets++;
    st.maxWeight = Math.max(st.maxWeight, s.weight ?? 0);
    st.volume += setVolume(s);
    st.totalReps += s.reps ?? 0;
    const e = e1rm(s.weight, s.reps, s.rir);
    if (e > st.bestE1rm || !st.bestSet) {
      st.bestE1rm = Math.max(st.bestE1rm, e);
      st.bestSet = s;
    }
  }
  return st;
}

export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (isWorkingDone(s)) v += setVolume(s);
  return v;
}

export function workoutWorkingSets(w: Workout): number {
  let n = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (isWorkingDone(s)) n++;
  return n;
}

export type Trend = 'up' | 'same' | 'down';

export interface Comparison {
  trend: Trend;
  /** Diferencia en kg de 1RM estimado, o en repeticiones si es sin carga. */
  delta: number;
  unit: 'kg' | 'reps';
}

/**
 * Compara la mejor serie efectiva de hoy con la de la última sesión.
 * Con carga: 1RM estimado (incluye reps y RIR). Sin carga (peso corporal): reps + RIR de la mejor serie.
 */
export function compareSessions(current: WorkoutExercise, previous: WorkoutExercise | undefined): Comparison | null {
  if (!previous) return null;
  const cur = exerciseStats(current);
  const prev = exerciseStats(previous);
  if (cur.workingSets === 0 || prev.workingSets === 0) return null;
  if (cur.bestE1rm > 0 && prev.bestE1rm > 0) {
    const delta = cur.bestE1rm - prev.bestE1rm;
    const rel = delta / prev.bestE1rm;
    return { trend: rel > 0.004 ? 'up' : rel < -0.004 ? 'down' : 'same', delta, unit: 'kg' };
  }
  const best = (ex: WorkoutExercise) =>
    Math.max(0, ...ex.sets.filter(isWorkingDone).map((s) => (s.reps ?? 0) + (s.rir ?? 0)));
  const delta = best(current) - best(previous);
  return { trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same', delta, unit: 'reps' };
}

/**
 * Doble progresión: si en la última sesión todas las series efectivas llegaron al tope del rango
 * con el RIR objetivo (o más), toca subir peso.
 */
export function suggestion(
  target: Target | undefined,
  previous: WorkoutExercise | undefined,
  increment: number,
): { type: 'increase'; weight: number } | { type: 'keep'; weight: number } | null {
  if (!target || !previous) return null;
  const working = previous.sets.filter(isWorkingDone);
  if (working.length === 0) return null;
  const top = Math.max(...working.map((s) => s.weight ?? 0));
  if (top <= 0) return null;
  const atTop = working.filter((s) => (s.weight ?? 0) === top);
  const allHit = atTop.every((s) => (s.reps ?? 0) >= target.repMax && (s.rir == null || s.rir >= target.rir));
  if (allHit && atTop.length === working.length) return { type: 'increase', weight: roundTo(top + increment, increment) };
  return { type: 'keep', weight: top };
}

export function roundTo(n: number, step: number): number {
  if (!step) return n;
  return Math.round(n / step) * step;
}

/** Valores de referencia para cada serie: la serie equivalente de la sesión anterior. */
export function previousForSets(current: WorkoutExercise, previous: WorkoutExercise | undefined): (WorkoutSet | undefined)[] {
  const prevByType = {
    warmup: previous?.sets.filter((s) => s.done && s.type === 'warmup') ?? [],
    working: previous?.sets.filter((s) => s.done && s.type === 'working') ?? [],
  };
  const counters = { warmup: 0, working: 0 };
  return current.sets.map((s) => {
    const list = prevByType[s.type];
    const idx = counters[s.type]++;
    return list[idx];
  });
}

export function incrementFor(ex: Exercise | undefined, fallback: number): number {
  return ex?.increment ?? fallback;
}
