import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Equal, Trophy } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import type { Workout } from '../../db/types';
import { previousSession } from '../../db/queries';
import { compareSessions, exerciseStats, workoutVolume, workoutWorkingSets } from '../../lib/calc';
import { fmtDateLong, fmtDuration, fmtKg, fmtSet, fmtVolume } from '../../lib/format';
import { useExerciseMap } from '../../db/hooks';

export function Summary({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const exMap = useExerciseMap();
  const comparisons = useLiveQuery(async () => {
    if (!workout) return [];
    return Promise.all(
      workout.exercises.map(async (e) => compareSessions(e, (await previousSession(e.exerciseId, workout.startedAt, workout.id))?.exercise)),
    );
  }, [workout?.id]);

  if (!workout) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const ups = comparisons?.filter((c) => c?.trend === 'up').length ?? 0;
  const compared = comparisons?.filter(Boolean).length ?? 0;

  return (
    <Sheet open={!!workout} onClose={onClose} size="full">
      <div className="sheet-scroll summary">
        <div className="summary__hero">
          <div className="summary__trophy">
            <Trophy size={34} />
          </div>
          <h2>¡Entreno completado!</h2>
          <p className="muted">
            {workout.name} · {fmtDateLong(workout.startedAt)}
          </p>
          {compared > 0 && (
            <p className="summary__progress">
              Has progresado en <b>{ups}</b> de {compared} ejercicio{compared === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="stats-grid">
          <div className="stat">
            <span className="stat__value">{fmtDuration((workout.endedAt ?? Date.now()) - workout.startedAt)}</span>
            <span className="stat__label">Duración</span>
          </div>
          <div className="stat">
            <span className="stat__value">{fmtVolume(workoutVolume(workout))} kg</span>
            <span className="stat__label">Volumen</span>
          </div>
          <div className="stat">
            <span className="stat__value">{workoutWorkingSets(workout)}</span>
            <span className="stat__label">Series efectivas</span>
          </div>
        </div>
        <div className="group summary__list">
          {workout.exercises.map((e, i) => {
            const st = exerciseStats(e);
            const c = comparisons?.[i];
            return (
              <div key={e.id} className="group__row summary__row">
                <span className="summary__ex">
                  <span>{exMap.get(e.exerciseId)?.name}</span>
                  <small className="muted">
                    {st.workingSets} series · mejor {st.bestSet ? fmtSet(st.bestSet.weight, st.bestSet.reps, st.bestSet.rir) : '—'}
                  </small>
                </span>
                {c && (
                  <span className={`trend trend--${c.trend}`}>
                    {c.trend === 'up' ? <ArrowUp size={14} /> : c.trend === 'down' ? <ArrowDown size={14} /> : <Equal size={14} />}
                    {c.trend !== 'same' && `${fmtKg(Math.abs(Math.round(c.delta * 10) / 10))}${c.unit === 'kg' ? ' kg' : ''}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="form">
          <button className="btn btn--primary btn--block btn--lg" onClick={onClose}>
            Hecho
          </button>
        </div>
      </div>
    </Sheet>
  );
}
