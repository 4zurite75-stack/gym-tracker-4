import { create } from 'zustand';
import { db } from '../db/db';
import { activeWorkout } from '../db/queries';
import type { Routine, SetType, Workout, WorkoutExercise, WorkoutSet } from '../db/types';
import { uid } from '../lib/id';
import { workoutDefaultName } from '../lib/format';

interface WorkoutState {
  workout: Workout | null;
  loaded: boolean;
  expanded: boolean;
  load: () => Promise<void>;
  start: (routine?: Routine) => Promise<void>;
  mutate: (fn: (w: Workout) => void) => void;
  setExpanded: (v: boolean) => void;
  discard: () => Promise<void>;
  finish: () => Promise<Workout | null>;
}

export const newSet = (type: SetType = 'working', from?: Partial<WorkoutSet>): WorkoutSet => ({
  id: uid(),
  type,
  weight: from?.weight ?? null,
  reps: from?.reps ?? null,
  rir: from?.rir ?? null,
  done: false,
});

export function exerciseFromRoutine(re: Routine['exercises'][number]): WorkoutExercise {
  return {
    id: uid(),
    exerciseId: re.exerciseId,
    target: { ...re.target },
    restSec: re.restSec,
    sets: [
      ...Array.from({ length: re.warmupSets }, () => newSet('warmup')),
      ...Array.from({ length: Math.max(1, re.workingSets) }, () => newSet('working')),
    ],
  };
}

export function newWorkoutExercise(exerciseId: string): WorkoutExercise {
  return { id: uid(), exerciseId, sets: [newSet('working')] };
}

let writeChain: Promise<unknown> = Promise.resolve();
function persist(w: Workout) {
  const copy = w;
  writeChain = writeChain.then(() => db.workouts.put(copy)).catch((e) => console.error('No se pudo guardar', e));
}

export const useWorkout = create<WorkoutState>((set, get) => ({
  workout: null,
  loaded: false,
  expanded: false,

  load: async () => {
    const w = await activeWorkout();
    set({ workout: w ?? null, loaded: true });
  },

  start: async (routine) => {
    const now = Date.now();
    const w: Workout = {
      id: uid(),
      name: routine?.name ?? workoutDefaultName(now),
      routineId: routine?.id,
      status: 'active',
      startedAt: now,
      exercises: routine ? routine.exercises.map(exerciseFromRoutine) : [],
      exerciseIds: [],
      rest: null,
    };
    w.exerciseIds = [...new Set(w.exercises.map((e) => e.exerciseId))];
    await db.workouts.put(w);
    set({ workout: w, expanded: true });
  },

  mutate: (fn) => {
    const cur = get().workout;
    if (!cur) return;
    const next = structuredClone(cur);
    fn(next);
    next.exerciseIds = [...new Set(next.exercises.map((e) => e.exerciseId))];
    set({ workout: next });
    persist(next);
  },

  setExpanded: (v) => set({ expanded: v }),

  discard: async () => {
    const w = get().workout;
    set({ workout: null, expanded: false });
    if (w) {
      await writeChain;
      await db.workouts.delete(w.id);
    }
  },

  finish: async () => {
    const w = get().workout;
    if (!w) return null;
    const done = structuredClone(w);
    done.status = 'done';
    done.endedAt = Date.now();
    done.rest = null;
    done.exercises = done.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done && s.reps != null) }))
      .filter((e) => e.sets.length > 0);
    done.exerciseIds = [...new Set(done.exercises.map((e) => e.exerciseId))];
    await writeChain;
    await db.workouts.put(done);
    set({ workout: null, expanded: false });
    return done;
  },
}));

// Guardado extra al pasar a segundo plano (iOS puede cerrar la app en cualquier momento).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    const w = useWorkout.getState().workout;
    if (w) persist(w);
  }
});
