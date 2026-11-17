import { useMemo } from 'react';
import { Clock3, Dumbbell, Trophy, Weight } from 'lucide-react';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/controls';
import { prCount, useHistory } from '../../db/useHistory';
import { useExerciseMap } from '../../db/hooks';
import { addWeeks, weekStart } from '../../lib/stats';
import { fmtDateShort, fmtDuration, fmtTime, fmtVolume, relativeDay } from '../../lib/format';
import { workoutVolume, workoutWorkingSets } from '../../lib/calc';
import { push } from '../../nav/nav';
import { WorkoutDetail } from './WorkoutDetail';
import type { Workout } from '../../db/types';

function weekTitle(ws: number): string {
  const now = weekStart(Date.now());
  if (ws === now) return 'Esta semana';
  if (ws === addWeeks(now, -1)) return 'Semana pasada';
  const end = addWeeks(ws, 1) - 86400000;
  return `${fmtDateShort(ws)} – ${fmtDateShort(end)}`;
}

export function HistoryHome() {
  const data = useHistory();
  const exMap = useExerciseMap();

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, Workout[]>();
    for (const w of [...data.asc].reverse()) {
      const k = weekStart(w.startedAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(w);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <Page title="Historial" large>
      {data && data.asc.length === 0 && (
        <Empty icon={<Clock3 size={30} />} title="Aún no hay entrenos" text="Cuando termines tu primer entreno aparecerá aquí." />
      )}
      {groups.map(([ws, list]) => {
        const sets = list.reduce((n, w) => n + workoutWorkingSets(w), 0);
        return (
          <div key={ws} className="hist-week">
            <div className="hist-week__head">
              <span>{weekTitle(ws)}</span>
              <span className="muted">
                {list.length} entreno{list.length === 1 ? '' : 's'} · {sets} series
              </span>
            </div>
            {list.map((w) => {
              const prs = data ? prCount(w, data.prs) : 0;
              return (
                <button key={w.id} className="hist-card" onClick={() => push(() => <WorkoutDetail id={w.id} />)}>
                  <div className="hist-card__top">
                    <span className="hist-card__name">{w.name}</span>
                    {prs > 0 && (
                      <span className="pr-badge">
                        <Trophy size={12} /> {prs}
                      </span>
                    )}
                  </div>
                  <div className="hist-card__date">
                    {relativeDay(w.startedAt)} · {fmtTime(w.startedAt)}
                  </div>
                  <div className="hist-card__stats">
                    <span>
                      <Clock3 size={14} /> {fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt)}
                    </span>
                    <span>
                      <Weight size={14} /> {fmtVolume(workoutVolume(w))} kg
                    </span>
                    <span>
                      <Dumbbell size={14} /> {workoutWorkingSets(w)} series
                    </span>
                  </div>
                  <ul className="hist-card__list">
                    {w.exercises.slice(0, 5).map((e) => (
                      <li key={e.id}>
                        <span className="hist-card__n">{e.sets.filter((s) => s.type === 'working').length} ×</span>
                        {exMap.get(e.exerciseId)?.name ?? 'Ejercicio'}
                      </li>
                    ))}
                    {w.exercises.length > 5 && <li className="muted">y {w.exercises.length - 5} más…</li>}
                  </ul>
                </button>
              );
            })}
          </div>
        );
      })}
    </Page>
  );
}
