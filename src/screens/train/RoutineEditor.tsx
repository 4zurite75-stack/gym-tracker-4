import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Timer, X } from 'lucide-react';
import { db } from '../../db/db';
import { useExerciseMap } from '../../db/hooks';
import type { Routine, RoutineExercise } from '../../db/types';
import { Page } from '../../ui/Page';
import { Stepper } from '../../ui/controls';
import { SortableList } from '../../ui/SortableList';
import { ExercisePicker } from './ExercisePicker';
import { uid } from '../../lib/id';
import { pop } from '../../nav/nav';
import { confirm, showActions, toast } from '../../ui/uiStore';
import { fmtRest } from '../../lib/format';
import { REST_OPTIONS } from '../../ui/restOptions';
import { useSettings } from '../../state/settings';
import { MuscleBadge } from './ExerciseRow';

export function newRoutineExercise(exerciseId: string, compound: boolean): RoutineExercise {
  return {
    id: uid(),
    exerciseId,
    warmupSets: compound ? 2 : 0,
    workingSets: 3,
    target: compound ? { repMin: 6, repMax: 8, rir: 2 } : { repMin: 10, repMax: 15, rir: 1 },
  };
}

export function RoutineEditor({ id }: { id?: string }) {
  const existing = useLiveQuery(() => (id ? db.routines.get(id) : undefined), [id]);
  const exMap = useExerciseMap();
  const settings = useSettings();
  const [name, setName] = useState('');
  const [items, setItems] = useState<RoutineExercise[]>([]);
  const [picking, setPicking] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setItems(existing.exercises);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const update = (rid: string, patch: (r: RoutineExercise) => RoutineExercise) => {
    setItems((list) => list.map((r) => (r.id === rid ? patch(r) : r)));
    setDirty(true);
  };

  const save = async () => {
    const now = Date.now();
    const count = await db.routines.count();
    const r: Routine = {
      id: existing?.id ?? uid(),
      name: name.trim() || 'Rutina sin nombre',
      order: existing?.order ?? count,
      exercises: items,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.routines.put(r);
    toast(existing ? 'Rutina guardada' : 'Rutina creada', { tone: 'success' });
    pop();
  };

  const cancel = async () => {
    if (dirty && !(await confirm({ title: '¿Descartar cambios?', confirmText: 'Descartar', destructive: true }))) return;
    pop();
  };

  const pickRest = (r: RoutineExercise) =>
    showActions({
      title: 'Descanso entre series',
      actions: [
        {
          label: `Por defecto (${fmtRest(settings.defaultRestSec)})`,
          selected: r.restSec == null,
          onSelect: () => update(r.id, (x) => ({ ...x, restSec: undefined })),
        },
        ...REST_OPTIONS.map((sec) => ({
          label: fmtRest(sec),
          selected: r.restSec === sec,
          onSelect: () => update(r.id, (x) => ({ ...x, restSec: sec })),
        })),
      ],
    });

  return (
    <Page
      title={id ? 'Editar rutina' : 'Nueva rutina'}
      back="Cancelar"
      onBack={cancel}
      right={
        <button className="link-btn is-bold" onClick={save} disabled={items.length === 0 && !name.trim()}>
          Guardar
        </button>
      }
    >
      <div className="form" style={{ paddingTop: 8 }}>
        <input
          className="input input--title"
          placeholder="Nombre de la rutina (p. ej. Torso A)"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          enterKeyHint="done"
        />
      </div>

      <div className="routine-list">
        <SortableList
          items={items}
          getId={(r) => r.id}
          onReorder={(next) => {
            setItems(next);
            setDirty(true);
          }}
          render={(r, handle) => {
            const ex = exMap.get(r.exerciseId);
            return (
              <div className="rcard">
                <div className="rcard__head">
                  {handle}
                  {ex && <MuscleBadge ex={ex} />}
                  <div className="rcard__name">{ex?.name ?? 'Ejercicio'}</div>
                  <button
                    className="icon-btn icon-btn--muted"
                    aria-label="Quitar"
                    onClick={() => {
                      setItems((l) => l.filter((x) => x.id !== r.id));
                      setDirty(true);
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="rcard__grid">
                  <div className="rcard__cell">
                    <span className="rcard__label">Calentamiento</span>
                    <Stepper value={r.warmupSets} max={6} onChange={(v) => update(r.id, (x) => ({ ...x, warmupSets: v }))} />
                  </div>
                  <div className="rcard__cell">
                    <span className="rcard__label">Series efectivas</span>
                    <Stepper value={r.workingSets} min={1} max={10} onChange={(v) => update(r.id, (x) => ({ ...x, workingSets: v }))} />
                  </div>
                  <div className="rcard__cell">
                    <span className="rcard__label">Reps mín.</span>
                    <Stepper
                      value={r.target.repMin}
                      min={1}
                      max={50}
                      onChange={(v) =>
                        update(r.id, (x) => ({ ...x, target: { ...x.target, repMin: v, repMax: Math.max(v, x.target.repMax) } }))
                      }
                    />
                  </div>
                  <div className="rcard__cell">
                    <span className="rcard__label">Reps máx.</span>
                    <Stepper
                      value={r.target.repMax}
                      min={1}
                      max={50}
                      onChange={(v) =>
                        update(r.id, (x) => ({ ...x, target: { ...x.target, repMax: v, repMin: Math.min(v, x.target.repMin) } }))
                      }
                    />
                  </div>
                  <div className="rcard__cell">
                    <span className="rcard__label">RIR objetivo</span>
                    <Stepper value={r.target.rir} max={5} onChange={(v) => update(r.id, (x) => ({ ...x, target: { ...x.target, rir: v } }))} />
                  </div>
                  <div className="rcard__cell">
                    <span className="rcard__label">Descanso</span>
                    <button className="pill-btn" onClick={() => pickRest(r)}>
                      <Timer size={15} />
                      {r.restSec ? fmtRest(r.restSec) : `${fmtRest(settings.defaultRestSec)}*`}
                    </button>
                  </div>
                </div>
                <div className="rcard__summary">
                  {r.workingSets} × {r.target.repMin === r.target.repMax ? r.target.repMin : `${r.target.repMin}–${r.target.repMax}`} @ RIR{' '}
                  {r.target.rir}
                  {r.warmupSets > 0 && ` · ${r.warmupSets} de calentamiento`}
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="form">
        <button className="btn btn--tinted btn--block" onClick={() => setPicking(true)}>
          <Plus size={20} /> Añadir ejercicios
        </button>
        {items.length > 0 && <p className="hint">* Descanso por defecto (se cambia en Ajustes). Arrastra ⋮⋮ para reordenar.</p>}
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ids) => {
          setItems((l) => [...l, ...ids.map((eid) => newRoutineExercise(eid, exMap.get(eid)?.mechanic === 'compuesto'))]);
          setDirty(true);
        }}
      />
    </Page>
  );
}
