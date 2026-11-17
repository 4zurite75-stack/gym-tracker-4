import { create } from 'zustand';
import type { WorkoutSet } from '../../db/types';
import { useWorkout } from '../../state/workout';
import { fmtKg } from '../../lib/format';

export type Field = 'weight' | 'reps' | 'rir';

export interface Focus {
  exId: string; // id del WorkoutExercise
  setId: string;
  field: Field;
}

interface KeypadState {
  focus: Focus | null;
  raw: string;
  fresh: boolean;
}

export const useKeypad = create<KeypadState>(() => ({ focus: null, raw: '', fresh: true }));

/** Referencias de la sesión anterior para cada serie (setId → serie previa). Lo rellenan las tarjetas. */
export const placeholderCache = new Map<string, WorkoutSet | undefined>();
/** Incremento de peso por ejercicio del entreno (WorkoutExercise.id → kg). */
export const incrementCache = new Map<string, number>();

const MAX_LEN: Record<Field, number> = { weight: 6, reps: 3, rir: 3 };

function findSet(f: Focus) {
  const w = useWorkout.getState().workout;
  const ex = w?.exercises.find((e) => e.id === f.exId);
  const set = ex?.sets.find((s) => s.id === f.setId);
  return { w, ex, set };
}

function parse(raw: string): number | null {
  if (!raw || raw === ',') return null;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function commit(raw: string, fresh = false) {
  const f = useKeypad.getState().focus;
  if (!f) return;
  useKeypad.setState({ raw, fresh });
  const value = parse(raw);
  useWorkout.getState().mutate((w) => {
    const set = w.exercises.find((e) => e.id === f.exId)?.sets.find((s) => s.id === f.setId);
    if (set) set[f.field] = f.field === 'reps' && value != null ? Math.round(value) : value;
  });
}

export function focusField(f: Focus) {
  const { set } = findSet(f);
  const v = set?.[f.field];
  useKeypad.setState({ focus: f, raw: v == null ? '' : fmtKg(v), fresh: true });
}

export function closeKeypad() {
  useKeypad.setState({ focus: null, raw: '', fresh: true });
}

export function typeDigit(d: string) {
  const { focus, raw, fresh } = useKeypad.getState();
  if (!focus) return;
  let next = fresh ? d : raw + d;
  if (next.length > MAX_LEN[focus.field]) return;
  if (/^0\d/.test(next)) next = next.slice(1);
  commit(next);
}

export function typeComma() {
  const { focus, raw, fresh } = useKeypad.getState();
  if (!focus || focus.field === 'reps') return;
  if (fresh || raw === '') return commit('0,');
  if (!raw.includes(',')) commit(raw + ',');
}

export function backspace() {
  const { raw } = useKeypad.getState();
  commit(raw.slice(0, -1));
}

export function stepValue(dir: 1 | -1) {
  const { focus } = useKeypad.getState();
  if (!focus) return;
  const { set } = findSet(focus);
  const ph = placeholderCache.get(focus.setId);
  const base = set?.[focus.field] ?? ph?.[focus.field] ?? 0;
  const step = focus.field === 'weight' ? incrementCache.get(focus.exId) ?? 2.5 : 1;
  const next = Math.max(0, Math.round((base + dir * step) * 100) / 100);
  commit(fmtKg(next), true);
}

/** Pasa al siguiente campo: kg → reps → RIR → siguiente serie. */
export function nextField() {
  const { focus } = useKeypad.getState();
  if (!focus) return;
  const { ex, set } = findSet(focus);
  if (!ex || !set) return closeKeypad();
  const order: Field[] = set.type === 'warmup' ? ['weight', 'reps'] : ['weight', 'reps', 'rir'];
  const i = order.indexOf(focus.field);
  if (i >= 0 && i < order.length - 1) return focusField({ ...focus, field: order[i + 1] });
  const idx = ex.sets.findIndex((s) => s.id === set.id);
  const nextSet = ex.sets.slice(idx + 1).find((s) => !s.done);
  if (nextSet) return focusField({ exId: ex.id, setId: nextSet.id, field: 'weight' });
  closeKeypad();
}
