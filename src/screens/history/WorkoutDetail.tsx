import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Repeat, Trash2, Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { Page } from '../../ui/Page';
import { useExerciseMap } from '../../db/hooks';
import { prCount, useHistory } from '../../db/useHistory';
import { fmtDateLong, fmtDuration, fmtKg, fmtTime, fmtVolume } from '../../lib/format';
import { e1rm, workoutVolume, workoutWorkingSets } from '../../lib/calc';
import { PR_LABEL, topPR } from '../../lib/stats';
import { confirm, toast } from '../../ui/uiStore';
import { pop, push } from '../../nav/nav';
import { WorkoutEditor } from './WorkoutEditor';
import { MuscleBadge } from '../train/ExerciseRow';
import { ExerciseProgress } from '../progress/ExerciseProgress';
import { useWorkout, newSet } from '../../state/workout';
import { uid } from '../../lib/id';
import type { Workout } from '../../db/types';

export async function repeatWorkout(w: Workout) {
  const st = useWorkout.getState();
  if (st.workout) {
    toast('Ya tienes un entreno en curso');
    st.setExpanded(true);
    return;
  }
  await st.start();
  st.mutate((nw) => {
    nw.name = w.name;
    nw.routineId = w.routineId;
    nw.exercises = w.exercises.map((e) => ({
      id: uid(),
      exerciseId: e.exerciseId,
      target: e.target,
      restSec: e.restSec,
      sets: e.sets.map((s) => newSet(s.type)),
    }));
  });
}

export function WorkoutDetail({ id }: { id: string }) {
  const w = useLiveQuery(() => db.workouts.get(id), [id]);
  const hist = useHistory();
  const exMap = useExerciseMap();
  if (!w) return <Page title="" back />;
  const prs = hist ? prCount(w, hist.prs) : 0;

  const remove = async () => {
    if (!(await confirm({ title: '¿Eliminar este entreno?', message: 'No se puede deshacer.', confirmText: 'Eliminar', destructive: true }))) return;
    pop();
    await db.workouts.delete(id);
    toast('Entreno eliminado');
  };

  return (
    <Page
      title={w.name}
      back="Historial"
      right={
        <button className="link-btn" onClick={() => push(() => <WorkoutEditor id={id} />)}>
          Editar
        </button>
      }
    >
      <div className="wd-head">
        <h2>{w.name}</h2>
        <p className="muted">
          {fmtDateLong(w.startedAt)} · {fmtTime(w.startedAt)}
        </p>
      </div>
      <div className="stats-grid stats-grid--4">
        <div className="stat">
          <span className="stat__value">{fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt)}</span>
          <span className="stat__label">Duración</span>
        </div>
        <div className="stat">
          <span className="stat__value">{fmtVolume(workoutVolume(w))}</span>
          <span className="stat__label">Volumen (kg)</span>
        </div>
        <div className="stat">
          <span className="stat__value">{workoutWorkingSets(w)}</span>
          <span className="stat__label">Series</span>
        </div>
        <div className="stat">
          <span className="stat__value">{prs}</span>
          <span className="stat__label">Récords</span>
        </div>
      </div>
      {w.notes && <p className="wd-notes">{w.notes}</p>}

      {w.exercises.map((e) => {
        const ex = exMap.get(e.exerciseId);
        let n = 0;
        return (
          <div key={e.id} className="wd-ex">
            <button className="wd-ex__head" onClick={() => push(() => <ExerciseProgress id={e.exerciseId} />)}>
              {ex && <MuscleBadge ex={ex} />}
              <span className="wd-ex__name">{ex?.name ?? 'Ejercicio'}</span>
              <ChevronRight size={18} className="muted" />
            </button>
            <div className="wd-sets">
              {e.sets.map((s) => {
                const pr = hist?.prs.get(s.id);
                const top = pr && topPR(pr);
                return (
                  <div key={s.id} className="wd-set">
                    <span className={`set-badge ${s.type === 'warmup' ? 'is-warmup' : ''}`}>{s.type === 'warmup' ? 'C' : ++n}</span>
                    <span className="wd-set__main">
                      {s.weight != null && s.weight > 0 ? `${fmtKg(s.weight)} kg × ${s.reps}` : `${s.reps} reps`}
                      {s.rir != null && <span className="muted"> @ RIR {fmtKg(s.rir)}</span>}
                    </span>
                    {top ? (
                      <span className="pr-badge" title={PR_LABEL[top]}>
                        <Trophy size={12} /> {PR_LABEL[top].split(' (')[0]}
                      </span>
                    ) : (
                      s.type === 'working' &&
                      (s.weight ?? 0) > 0 && <span className="wd-set__e1rm">{fmtKg(Math.round(e1rm(s.weight, s.reps, s.rir)))}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="form" style={{ marginTop: 8 }}>
        <button className="btn btn--tinted btn--block" onClick={() => void repeatWorkout(w)}>
          <Repeat size={18} /> Repetir este entreno
        </button>
      </div>
      <button className="btn btn--danger-plain" onClick={remove}>
        <Trash2 size={18} /> Eliminar entreno
      </button>
      <p className="hint" style={{ textAlign: 'center' }}>
        La cifra gris a la derecha es el 1RM estimado de la serie.
      </p>
    </Page>
  );
}
