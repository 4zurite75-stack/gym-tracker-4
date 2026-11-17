import { useEffect, useState } from 'react';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import { SortableList } from '../../ui/SortableList';
import { useWorkout } from '../../state/workout';
import { db } from '../../db/db';
import type { Exercise, WorkoutExercise } from '../../db/types';
import { MuscleBadge } from '../train/ExerciseRow';

export function RenameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const name = useWorkout((s) => s.workout?.name ?? '');
  const [value, setValue] = useState(name);
  useEffect(() => {
    if (open) setValue(name);
  }, [open, name]);
  const save = () => {
    const v = value.trim();
    if (v) useWorkout.getState().mutate((w) => void (w.name = v));
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader
        title="Nombre del entreno"
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn is-bold" onClick={save}>
            Guardar
          </button>
        }
      />
      <div className="form" style={{ paddingBottom: 24 }}>
        <input
          className="input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          enterKeyHint="done"
        />
      </div>
    </Sheet>
  );
}

export function NotesSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const [value, setValue] = useState('');
  useEffect(() => {
    if (exercise) setValue(exercise.notes);
  }, [exercise]);
  const save = async () => {
    if (exercise) await db.exercises.update(exercise.id, { notes: value.trim(), updatedAt: Date.now() });
    onClose();
  };
  return (
    <Sheet open={!!exercise} onClose={onClose}>
      <SheetHeader
        title="Notas"
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn is-bold" onClick={save}>
            Guardar
          </button>
        }
      />
      <div className="form" style={{ paddingBottom: 24 }}>
        <p className="hint" style={{ marginTop: 0 }}>
          {exercise?.name} — se guardan en el ejercicio y las verás siempre.
        </p>
        <textarea
          className="input textarea"
          rows={5}
          value={value}
          placeholder="Asiento en 4, agarre neutro, pausa abajo…"
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </Sheet>
  );
}

const NO_EXERCISES: WorkoutExercise[] = [];

export function ReorderSheet({ open, onClose, exMap }: { open: boolean; onClose: () => void; exMap: Map<string, Exercise> }) {
  const exercises = useWorkout((s) => s.workout?.exercises ?? NO_EXERCISES);
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader
        title="Reordenar ejercicios"
        right={
          <button className="link-btn is-bold" onClick={onClose}>
            Hecho
          </button>
        }
      />
      <div className="sheet-scroll reorder-list">
        <SortableList<WorkoutExercise>
          items={exercises}
          getId={(e) => e.id}
          onReorder={(next) =>
            useWorkout.getState().mutate((w) => {
              const byId = new Map(w.exercises.map((e) => [e.id, e]));
              w.exercises = next.map((e) => byId.get(e.id)!);
            })
          }
          render={(e, handle) => {
            const ex = exMap.get(e.exerciseId);
            return (
              <div className="reorder-row">
                {ex && <MuscleBadge ex={ex} />}
                <span className="reorder-row__name">{ex?.name}</span>
                <span className="muted">{e.sets.length} series</span>
                {handle}
              </div>
            );
          }}
        />
      </div>
    </Sheet>
  );
}
