import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChartLine, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import { EQUIPMENT_LABEL, MECHANIC_LABEL, MUSCLE_LABEL } from '../../db/labels';
import { Page } from '../../ui/Page';
import { ExerciseForm } from './ExerciseForm';
import { confirm, toast } from '../../ui/uiStore';
import { pop, push } from '../../nav/nav';
import { ExerciseProgress } from '../progress/ExerciseProgress';
import { fmtKg } from '../../lib/format';
import { useSettings } from '../../state/settings';
import { MuscleBadge } from './ExerciseRow';

export function ExerciseDetail({ id }: { id: string }) {
  const ex = useLiveQuery(() => db.exercises.get(id), [id]);
  const settings = useSettings();
  const [editing, setEditing] = useState(false);

  if (!ex) return <Page title="" back />;

  const remove = async () => {
    const used = await db.workouts.where('exerciseIds').equals(id).count();
    const ok = await confirm({
      title: `¿Eliminar «${ex.name}»?`,
      message: used
        ? `Aparece en ${used} entreno${used === 1 ? '' : 's'}. Se ocultará de la biblioteca, pero tu historial se conserva.`
        : 'Se quitará de la biblioteca y de tus rutinas.',
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await db.transaction('rw', db.exercises, db.routines, async () => {
      if (used) await db.exercises.update(id, { deletedAt: Date.now() });
      else await db.exercises.delete(id);
      const routines = await db.routines.toArray();
      for (const r of routines) {
        if (r.exercises.some((e) => e.exerciseId === id)) {
          await db.routines.update(r.id, { exercises: r.exercises.filter((e) => e.exerciseId !== id) });
        }
      }
    });
    toast('Ejercicio eliminado');
    pop();
  };

  return (
    <Page
      title={ex.name}
      back
      right={
        <button className="link-btn" onClick={() => setEditing(true)}>
          Editar
        </button>
      }
    >
      <div className="detail-hero">
        <MuscleBadge ex={ex} />
        <div>
          <h2 className="detail-hero__title">{ex.name}</h2>
          <div className="detail-hero__meta">
            {EQUIPMENT_LABEL[ex.equipment]} · {MECHANIC_LABEL[ex.mechanic]}
          </div>
        </div>
      </div>

      <div className="group">
        <div className="group__row">
          <span>Principal</span>
          <span className="group__value">{MUSCLE_LABEL[ex.primary]}</span>
        </div>
        <div className="group__row">
          <span>Secundarios</span>
          <span className="group__value">{ex.secondary.length ? ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ') : '—'}</span>
        </div>
        <div className="group__row">
          <span>Incremento</span>
          <span className="group__value">
            {fmtKg(ex.increment ?? settings.weightIncrement)} kg{ex.increment == null ? ' (por defecto)' : ''}
          </span>
        </div>
      </div>

      <div className="group" style={{ marginTop: 12 }}>
        <button className="group__row group__row--link" onClick={() => push(() => <ExerciseProgress id={id} />)}>
          <span className="group__icon">
            <ChartLine size={18} />
          </span>
          <span>Progreso y récords</span>
          <ChevronRight size={18} className="muted" />
        </button>
      </div>

      <div className="group-title">Notas</div>
      <button className="group notes-card" onClick={() => setEditing(true)}>
        {ex.notes ? <p className="notes-text">{ex.notes}</p> : <p className="muted">Añade ajustes de la máquina, técnica…</p>}
        <Pencil size={16} className="muted" />
      </button>

      <button className="btn btn--danger-plain" onClick={remove}>
        <Trash2 size={18} /> Eliminar ejercicio
      </button>

      <ExerciseForm open={editing} onClose={() => setEditing(false)} exercise={ex} />
    </Page>
  );
}
