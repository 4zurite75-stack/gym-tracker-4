import { memo, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, Equal, MoreHorizontal, Plus, Target, TrendingUp } from 'lucide-react';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../db/types';
import { bestsBefore, previousSession } from '../../db/queries';
import { prTypes, updateBests } from '../../lib/stats';
import { compareSessions, incrementFor, previousForSets, suggestion } from '../../lib/calc';
import { fmtDateShort, fmtKg, fmtRest } from '../../lib/format';
import { MuscleBadge } from '../train/ExerciseRow';
import { SetRow } from './SetRow';
import { addSet, moveSet, removeSet, setSetType } from './actions';
import { incrementCache, placeholderCache } from './keypad';
import { showActions } from '../../ui/uiStore';
import { useSettings } from '../../state/settings';

interface Props {
  we: WorkoutExercise;
  exercise?: Exercise;
  workoutId: string;
  startedAt: number;
  onMenu: () => void;
}

function rangeText(min: number, max: number) {
  return min === max ? `${min}` : `${min}–${max}`;
}

export const ExerciseCard = memo(function ExerciseCard({ we, exercise, workoutId, startedAt, onMenu }: Props) {
  const settings = useSettings();
  const prev = useLiveQuery(() => previousSession(we.exerciseId, startedAt, workoutId), [we.exerciseId, startedAt, workoutId]);
  const bests = useLiveQuery(() => bestsBefore(we.exerciseId, startedAt, workoutId), [we.exerciseId, startedAt, workoutId]);
  const prSets = useMemo(() => {
    const out = new Set<string>();
    if (!bests) return out;
    const b = { ...bests };
    const ordered = we.sets.filter((s) => s.done).sort((x, y) => (x.completedAt ?? 0) - (y.completedAt ?? 0));
    for (const s of ordered) {
      if (prTypes(b, s).length) out.add(s.id);
      updateBests(b, s);
    }
    return out;
  }, [bests, we.sets]);
  const increment = incrementFor(exercise, settings.weightIncrement);
  incrementCache.set(we.id, increment);

  const fromHistory = useMemo(() => previousForSets(we, prev?.exercise), [we, prev]);
  const placeholders = useMemo(() => {
    // Si no hay historial para esa serie, se usa la serie anterior de hoy del mismo tipo.
    const out: (WorkoutSet | undefined)[] = [];
    we.sets.forEach((s, i) => {
      let ph = fromHistory[i];
      if (!ph) {
        for (let j = i - 1; j >= 0; j--) {
          const o = we.sets[j];
          if (o.type !== s.type) continue;
          ph = o.reps != null ? o : out[j];
          if (ph) break;
        }
      }
      out.push(ph);
    });
    return out;
  }, [we, fromHistory]);

  we.sets.forEach((s, i) => placeholderCache.set(s.id, placeholders[i]));

  const cmp = compareSessions(we, prev?.exercise);
  const sug = suggestion(we.target, prev?.exercise, increment);

  let workingN = 0;

  const badgeMenu = (s: WorkoutSet, idx: number) =>
    showActions({
      title: s.type === 'warmup' ? 'Serie de calentamiento' : 'Serie efectiva',
      actions: [
        { label: 'Calentamiento', selected: s.type === 'warmup', onSelect: () => setSetType(we.id, s.id, 'warmup') },
        { label: 'Efectiva', selected: s.type === 'working', onSelect: () => setSetType(we.id, s.id, 'working') },
        ...(idx > 0 ? [{ label: 'Mover arriba', onSelect: () => moveSet(we.id, s.id, -1) }] : []),
        ...(idx < we.sets.length - 1 ? [{ label: 'Mover abajo', onSelect: () => moveSet(we.id, s.id, 1) }] : []),
        { label: 'Eliminar serie', destructive: true, onSelect: () => removeSet(we.id, s.id) },
      ],
    });

  return (
    <section className="xcard">
      <header className="xcard__head">
        {exercise && <MuscleBadge ex={exercise} />}
        <div className="xcard__title">
          <h3>{exercise?.name ?? 'Ejercicio'}</h3>
          <div className="xcard__sub">
            {prev ? `Última vez: ${fmtDateShort(prev.workout.startedAt)}` : 'Primera vez'}
            {we.restSec ? ` · descanso ${fmtRest(we.restSec)}` : ''}
          </div>
        </div>
        <button className="icon-btn icon-btn--muted" onClick={onMenu} aria-label="Opciones del ejercicio">
          <MoreHorizontal size={22} />
        </button>
      </header>

      {exercise?.notes && <p className="xcard__notes">{exercise.notes}</p>}

      {(we.target || sug?.type === 'increase' || cmp) && (
        <div className="xcard__pills">
          {we.target && (
            <span className="pill">
              <Target size={13} /> {rangeText(we.target.repMin, we.target.repMax)} reps @ RIR {we.target.rir}
            </span>
          )}
          {sug?.type === 'increase' && (
            <span className="pill pill--accent">
              <TrendingUp size={13} /> Sube a {fmtKg(sug.weight)} kg
            </span>
          )}
          {cmp && (
            <span className={`pill pill--${cmp.trend}`}>
              {cmp.trend === 'up' ? <ArrowUp size={13} /> : cmp.trend === 'down' ? <ArrowDown size={13} /> : <Equal size={13} />}
              {cmp.trend === 'same'
                ? 'Igual que la última vez'
                : `${cmp.delta > 0 ? '+' : '−'}${fmtKg(Math.abs(Math.round(cmp.delta * 10) / 10))} ${cmp.unit === 'kg' ? 'kg 1RM est.' : 'reps'}`}
            </span>
          )}
        </div>
      )}

      <div className="set-head">
        <span>Serie</span>
        <span>Anterior</span>
        <span>{exercise?.equipment === 'peso_corporal' ? '+kg' : 'kg'}</span>
        <span>Reps</span>
        <span>RIR</span>
        <span />
      </div>
      <div className="set-list">
        {we.sets.map((s, i) => {
          const label = s.type === 'warmup' ? 'C' : String(++workingN);
          return (
            <SetRow
              key={s.id}
              exId={we.id}
              set={s}
              label={label}
              prev={fromHistory[i]}
              ph={placeholders[i]}
              isPR={prSets.has(s.id)}
              onBadge={() => badgeMenu(s, i)}
            />
          );
        })}
      </div>
      <button className="add-set" onClick={() => addSet(we.id)}>
        <Plus size={17} strokeWidth={2.6} /> Añadir serie
      </button>
    </section>
  );
});
