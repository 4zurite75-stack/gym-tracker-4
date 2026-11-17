import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ListOrdered, NotebookPen, Plus, Timer, Trash2 } from 'lucide-react';
import { useWorkout, newWorkoutExercise } from '../../state/workout';
import { useExerciseMap } from '../../db/hooks';
import { ExerciseCard } from './ExerciseCard';
import { Keypad } from './Keypad';
import { RestBar } from './RestBar';
import { closeKeypad, useKeypad } from './keypad';
import { ExercisePicker } from '../train/ExercisePicker';
import { NotesSheet, RenameSheet, ReorderSheet } from './WorkoutSheets';
import { Summary } from './Summary';
import { useNow } from './useNow';
import { fmtClock, fmtRest } from '../../lib/format';
import { ask, confirm, showActions } from '../../ui/uiStore';
import type { Exercise, Workout, WorkoutExercise } from '../../db/types';
import { REST_OPTIONS } from '../../ui/restOptions';
import { useSettings } from '../../state/settings';
import { Empty } from '../../ui/controls';
import { Dumbbell } from 'lucide-react';

export function WorkoutScreen() {
  const workout = useWorkout((s) => s.workout);
  const expanded = useWorkout((s) => s.expanded);
  const exMap = useExerciseMap();
  const settings = useSettings();
  const keypadOpen = useKeypad((s) => !!s.focus);
  const now = useNow(!!workout && expanded);

  const [picking, setPicking] = useState<null | { replace?: string }>(null);
  const [renaming, setRenaming] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [notesFor, setNotesFor] = useState<Exercise | null>(null);
  const [summary, setSummary] = useState<Workout | null>(null);

  const minimize = () => {
    closeKeypad();
    useWorkout.getState().setExpanded(false);
  };

  const finish = async () => {
    if (!workout) return;
    closeKeypad();
    const all = workout.exercises.flatMap((e) => e.sets);
    const done = all.filter((s) => s.done).length;
    const pending = all.filter((s) => !s.done && (s.weight != null || s.reps != null)).length;
    if (done === 0) {
      const ok = await confirm({
        title: 'No has completado ninguna serie',
        message: 'Marca las series con ✓ para guardarlas. ¿Quieres descartar este entreno?',
        confirmText: 'Descartar',
        cancelText: 'Seguir entrenando',
        destructive: true,
      });
      if (ok) await useWorkout.getState().discard();
      return;
    }
    const ok = await confirm({
      title: '¿Terminar entreno?',
      message: pending
        ? `Hay ${pending} serie${pending === 1 ? '' : 's'} con datos sin marcar como hecha${pending === 1 ? '' : 's'}; no se guardarán.`
        : 'Las series sin completar se descartarán.',
      confirmText: 'Terminar',
    });
    if (!ok) return;
    const saved = await useWorkout.getState().finish();
    setSummary(saved);
  };

  const discard = async () => {
    const r = await ask({
      title: '¿Descartar entreno?',
      message: 'Se borrará todo lo registrado en este entreno.',
      confirmText: 'Descartar',
      destructive: true,
    });
    if (r === 'confirm') {
      closeKeypad();
      await useWorkout.getState().discard();
    }
  };

  const exerciseMenu = (we: WorkoutExercise) => {
    const ex = exMap.get(we.exerciseId);
    const mutate = useWorkout.getState().mutate;
    showActions({
      title: ex?.name,
      actions: [
        { label: 'Notas del ejercicio', icon: <NotebookPen size={18} />, onSelect: () => ex && setNotesFor(ex) },
        {
          label: `Descanso: ${fmtRest(we.restSec ?? settings.defaultRestSec)}`,
          icon: <Timer size={18} />,
          onSelect: () =>
            showActions({
              title: 'Descanso para este ejercicio',
              actions: [
                {
                  label: `Por defecto (${fmtRest(settings.defaultRestSec)})`,
                  selected: we.restSec == null,
                  onSelect: () => mutate((w) => void (w.exercises.find((e) => e.id === we.id)!.restSec = undefined)),
                },
                ...REST_OPTIONS.map((sec) => ({
                  label: fmtRest(sec),
                  selected: we.restSec === sec,
                  onSelect: () => mutate((w) => void (w.exercises.find((e) => e.id === we.id)!.restSec = sec)),
                })),
              ],
            }),
        },
        { label: 'Sustituir ejercicio', icon: <ArrowLeftRight size={18} />, onSelect: () => setPicking({ replace: we.id }) },
        { label: 'Reordenar ejercicios', icon: <ListOrdered size={18} />, onSelect: () => setReordering(true) },
        {
          label: 'Quitar ejercicio',
          icon: <Trash2 size={18} />,
          destructive: true,
          onSelect: async () => {
            if (we.sets.some((s) => s.done)) {
              const ok = await confirm({
                title: `¿Quitar ${ex?.name ?? 'ejercicio'}?`,
                message: 'Tiene series completadas que se perderán.',
                confirmText: 'Quitar',
                destructive: true,
              });
              if (!ok) return;
            }
            closeKeypad();
            mutate((w) => void (w.exercises = w.exercises.filter((e) => e.id !== we.id)));
          },
        },
      ],
    });
  };

  const onPick = (ids: string[]) => {
    const replace = picking?.replace;
    useWorkout.getState().mutate((w) => {
      if (replace) {
        const e = w.exercises.find((x) => x.id === replace);
        if (e && ids[0]) {
          e.exerciseId = ids[0];
          e.sets = e.sets.map((s) => (s.done ? s : { ...s, weight: null, reps: null, rir: null }));
        }
      } else w.exercises.push(...ids.map(newWorkoutExercise));
    });
  };

  return (
    <>
      <div className={`workout ${workout && expanded ? 'is-open' : ''}`} aria-hidden={!expanded}>
        {workout && (
          <>
            <header className="workout__head">
              <button className="icon-btn" onClick={minimize} aria-label="Minimizar">
                <ChevronDown size={28} />
              </button>
              <button className="workout__title" onClick={() => setRenaming(true)}>
                <span className="workout__name">{workout.name}</span>
                <span className="workout__clock">{fmtClock((now - workout.startedAt) / 1000)}</span>
              </button>
              <button className="btn btn--primary btn--sm" onClick={finish}>
                Terminar
              </button>
            </header>

            <div className="workout__scroll" onClick={(e) => e.target === e.currentTarget && closeKeypad()}>
              {workout.exercises.length === 0 && (
                <Empty icon={<Dumbbell size={30} />} title="Entreno vacío" text="Añade el primer ejercicio para empezar a registrar." />
              )}
              {workout.exercises.map((we) => (
                <ExerciseCard
                  key={we.id}
                  we={we}
                  exercise={exMap.get(we.exerciseId)}
                  workoutId={workout.id}
                  startedAt={workout.startedAt}
                  onMenu={() => exerciseMenu(we)}
                />
              ))}
              <div className="workout__footer">
                <button className="btn btn--tinted btn--block btn--lg" onClick={() => setPicking({})}>
                  <Plus size={20} strokeWidth={2.6} /> Añadir ejercicios
                </button>
                <button className="btn btn--danger-plain" onClick={discard}>
                  Descartar entreno
                </button>
              </div>
            </div>

            <div className={`workout__dock ${keypadOpen ? 'has-keypad' : ''}`}>
              <RestBar />
              <Keypad />
            </div>
          </>
        )}
      </div>

      <ExercisePicker
        open={!!picking}
        single={!!picking?.replace}
        title={picking?.replace ? 'Sustituir ejercicio' : 'Añadir ejercicios'}
        onClose={() => setPicking(null)}
        onPick={onPick}
      />
      <RenameSheet open={renaming} onClose={() => setRenaming(false)} />
      <ReorderSheet open={reordering} onClose={() => setReordering(false)} exMap={exMap} />
      <NotesSheet exercise={notesFor} onClose={() => setNotesFor(null)} />
      <Summary workout={summary} onClose={() => setSummary(null)} />
    </>
  );
}
