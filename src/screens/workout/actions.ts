import { useWorkout, newSet } from '../../state/workout';
import { placeholderCache } from './keypad';
import { unlockAudio } from '../../lib/sound';
import { getSettings } from '../../state/settings';
import { toast } from '../../ui/uiStore';
import type { SetType } from '../../db/types';
import { bestsBefore } from '../../db/queries';
import { PR_LABEL, prTypes, topPR, updateBests } from '../../lib/stats';
import { db } from '../../db/db';
import { createElement } from 'react';
import { Trophy } from 'lucide-react';

export async function toggleSetDone(exId: string, setId: string) {
  unlockAudio();
  const settings = await getSettings();
  const st = useWorkout.getState();
  const ex = st.workout?.exercises.find((e) => e.id === exId);
  const set = ex?.sets.find((s) => s.id === setId);
  if (!ex || !set) return false;

  if (set.done) {
    st.mutate((w) => {
      const s = w.exercises.find((e) => e.id === exId)!.sets.find((x) => x.id === setId)!;
      s.done = false;
      s.completedAt = undefined;
    });
    return false;
  }

  const ph = placeholderCache.get(setId);
  const reps = set.reps ?? ph?.reps ?? null;
  if (reps == null || reps <= 0) {
    toast('Introduce las repeticiones');
    return false;
  }
  const now = Date.now();
  const restBase = ex.restSec ?? settings.defaultRestSec;
  const rest = set.type === 'warmup' ? Math.min(60, restBase) : restBase;
  st.mutate((w) => {
    const s = w.exercises.find((e) => e.id === exId)!.sets.find((x) => x.id === setId)!;
    s.weight = s.weight ?? ph?.weight ?? null;
    s.reps = reps;
    if (s.type === 'working') s.rir = s.rir ?? ph?.rir ?? null;
    s.done = true;
    s.completedAt = now;
    if (rest > 0) w.rest = { startedAt: now, endsAt: now + rest * 1000, duration: rest };
  });
  void checkPR(exId, setId);
  return true;
}

async function checkPR(exId: string, setId: string) {
  const w = useWorkout.getState().workout;
  const ex = w?.exercises.find((e) => e.id === exId);
  if (!w || !ex) return;
  const b = await bestsBefore(ex.exerciseId, w.startedAt, w.id);
  // Series anteriores de hoy del mismo ejercicio (también en otras tarjetas del mismo ejercicio).
  for (const e of w.exercises) {
    if (e.exerciseId !== ex.exerciseId) continue;
    for (const s of e.sets) if (s.id !== setId && (s.completedAt ?? Infinity) < (ex.sets.find((x) => x.id === setId)?.completedAt ?? 0)) updateBests(b, s);
  }
  const set = ex.sets.find((s) => s.id === setId);
  if (!set) return;
  const top = topPR(prTypes(b, set));
  if (!top) return;
  const name = (await db.exercises.get(ex.exerciseId))?.name ?? '';
  toast(`¡Récord! ${PR_LABEL[top]} · ${name}`, { tone: 'accent', icon: createElement(Trophy, { size: 18 }), duration: 3500 });
}

export function addSet(exId: string, type: SetType = 'working') {
  useWorkout.getState().mutate((w) => {
    const ex = w.exercises.find((e) => e.id === exId);
    if (!ex) return;
    const s = newSet(type);
    if (type === 'warmup') {
      const firstWorking = ex.sets.findIndex((x) => x.type === 'working');
      ex.sets.splice(firstWorking < 0 ? ex.sets.length : firstWorking, 0, s);
    } else ex.sets.push(s);
  });
}

export function removeSet(exId: string, setId: string) {
  useWorkout.getState().mutate((w) => {
    const ex = w.exercises.find((e) => e.id === exId);
    if (ex) ex.sets = ex.sets.filter((s) => s.id !== setId);
  });
}

export function moveSet(exId: string, setId: string, dir: -1 | 1) {
  useWorkout.getState().mutate((w) => {
    const ex = w.exercises.find((e) => e.id === exId);
    if (!ex) return;
    const i = ex.sets.findIndex((s) => s.id === setId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ex.sets.length) return;
    [ex.sets[i], ex.sets[j]] = [ex.sets[j], ex.sets[i]];
  });
}

export function setSetType(exId: string, setId: string, type: SetType) {
  useWorkout.getState().mutate((w) => {
    const s = w.exercises.find((e) => e.id === exId)?.sets.find((x) => x.id === setId);
    if (s) {
      s.type = type;
      if (type === 'warmup') s.rir = null;
    }
  });
}

export function adjustRest(deltaSec: number) {
  useWorkout.getState().mutate((w) => {
    if (!w.rest) return;
    w.rest.endsAt += deltaSec * 1000;
    w.rest.duration = Math.max(1, w.rest.duration + deltaSec);
    if (w.rest.endsAt <= Date.now()) w.rest = null;
  });
}

export function skipRest() {
  useWorkout.getState().mutate((w) => {
    w.rest = null;
  });
}
