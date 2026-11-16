import { useLiveQuery } from 'dexie-react-hooks';
import { doneWorkoutsAsc } from './queries';
import { allPRs, type PRType } from '../lib/stats';
import type { Workout } from './types';

export interface HistoryData {
  asc: Workout[];
  prs: Map<string, PRType[]>;
}

/** Todos los entrenos terminados (orden cronológico) y los récords calculados. */
export function useHistory(): HistoryData | undefined {
  return useLiveQuery(async () => {
    const asc = await doneWorkoutsAsc();
    return { asc, prs: allPRs(asc) };
  }, []);
}

export function prCount(w: Workout, prs: Map<string, PRType[]>): number {
  let n = 0;
  for (const e of w.exercises) for (const s of e.sets) if (prs.has(s.id)) n++;
  return n;
}
