import { BookOpen, ChevronRight, Copy, MoreHorizontal, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Page } from '../../ui/Page';
import { useExerciseMap, useRoutines } from '../../db/hooks';
import { push } from '../../nav/nav';
import { RoutineEditor } from './RoutineEditor';
import { Library } from './Library';
import { useWorkout } from '../../state/workout';
import type { Routine } from '../../db/types';
import { db } from '../../db/db';
import { uid } from '../../lib/id';
import { confirm, showActions, toast } from '../../ui/uiStore';
import { useNow } from '../workout/useNow';
import { fmtClock } from '../../lib/format';

async function startWorkout(routine?: Routine) {
  const { workout, start, setExpanded } = useWorkout.getState();
  if (workout) {
    const ok = await confirm({
      title: 'Ya tienes un entreno en curso',
      message: 'Termínalo o descártalo antes de empezar otro.',
      confirmText: 'Ver entreno',
    });
    if (ok) setExpanded(true);
    return;
  }
  await start(routine);
}

export function TrainHome() {
  const routines = useRoutines();
  const exMap = useExerciseMap();
  const workout = useWorkout((s) => s.workout);
  const now = useNow(!!workout);

  const routineMenu = (r: Routine) =>
    showActions({
      title: r.name,
      actions: [
        { label: 'Editar', icon: <Pencil size={18} />, onSelect: () => push(() => <RoutineEditor id={r.id} />) },
        {
          label: 'Duplicar',
          icon: <Copy size={18} />,
          onSelect: async () => {
            const now = Date.now();
            await db.routines.put({
              ...structuredClone(r),
              id: uid(),
              name: `${r.name} (copia)`,
              order: (routines?.length ?? 0) + 1,
              createdAt: now,
              updatedAt: now,
            });
            toast('Rutina duplicada');
          },
        },
        {
          label: 'Eliminar',
          icon: <Trash2 size={18} />,
          destructive: true,
          onSelect: async () => {
            if (await confirm({ title: `¿Eliminar «${r.name}»?`, message: 'Tus entrenos pasados no se borran.', confirmText: 'Eliminar', destructive: true }))
              await db.routines.delete(r.id);
          },
        },
      ],
    });

  return (
    <Page title="Entrenar" large>
      {workout ? (
        <button className="resume-card" onClick={() => useWorkout.getState().setExpanded(true)}>
          <span className="resume-card__dot" />
          <span className="resume-card__text">
            <span className="resume-card__label">Entreno en curso</span>
            <span className="resume-card__name">{workout.name}</span>
          </span>
          <span className="resume-card__time">{fmtClock((now - workout.startedAt) / 1000)}</span>
          <ChevronRight size={20} />
        </button>
      ) : (
        <div className="section">
          <button className="btn btn--primary btn--block btn--lg" onClick={() => startWorkout()}>
            <Plus size={22} strokeWidth={2.6} /> Empezar entreno vacío
          </button>
        </div>
      )}

      <div className="section-head">
        <h2>Rutinas</h2>
        <button className="link-btn" onClick={() => push(() => <RoutineEditor />)}>
          <Plus size={18} /> Nueva
        </button>
      </div>

      {routines && routines.length === 0 && (
        <button className="routine-empty" onClick={() => push(() => <RoutineEditor />)}>
          <span className="routine-empty__title">Crea tu primera rutina</span>
          <span className="routine-empty__text">Por ejemplo «Torso A» o «Pierna», con sus series y rangos objetivo.</span>
        </button>
      )}

      <div className="routine-cards">
        {routines?.map((r) => (
          <div key={r.id} className="routine-card">
            <button className="routine-card__body" onClick={() => push(() => <RoutineEditor id={r.id} />)}>
              <span className="routine-card__name">{r.name}</span>
              <span className="routine-card__list">
                {r.exercises.length === 0
                  ? 'Sin ejercicios'
                  : r.exercises
                      .map((e) => exMap.get(e.exerciseId)?.name)
                      .filter(Boolean)
                      .join(' · ')}
              </span>
              <span className="routine-card__meta">
                {r.exercises.length} ejercicios · {r.exercises.reduce((n, e) => n + e.workingSets, 0)} series efectivas
              </span>
            </button>
            <div className="routine-card__actions">
              <button className="icon-btn icon-btn--muted" onClick={() => routineMenu(r)} aria-label="Opciones">
                <MoreHorizontal size={22} />
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => startWorkout(r)} disabled={r.exercises.length === 0}>
                <Play size={15} fill="currentColor" /> Empezar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Biblioteca</h2>
      </div>
      <div className="group">
        <button className="group__row group__row--link" onClick={() => push(() => <Library />)}>
          <span className="group__icon">
            <BookOpen size={18} />
          </span>
          <span>Ejercicios</span>
          <span className="group__value">{exMap.size ? [...exMap.values()].filter((e) => !e.deletedAt).length : ''}</span>
          <ChevronRight size={18} className="muted" />
        </button>
      </div>
    </Page>
  );
}
