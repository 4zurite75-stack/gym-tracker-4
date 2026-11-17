import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, X } from 'lucide-react';
import { db } from '../../db/db';
import { useExerciseMap } from '../../db/hooks';
import type { Workout, WorkoutSet } from '../../db/types';
import { Page } from '../../ui/Page';
import { Stepper } from '../../ui/controls';
import { ExercisePicker } from '../train/ExercisePicker';
import { MuscleBadge } from '../train/ExerciseRow';
import { pop } from '../../nav/nav';
import { confirm, toast } from '../../ui/uiStore';
import { uid } from '../../lib/id';
import { fmtKg } from '../../lib/format';

function toLocalInput(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function parseNum(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/** Campo numérico nativo: guarda el texto mientras escribes para admitir "82,". */
function NumInput({ value, onChange, decimal, placeholder }: { value: number | null; onChange: (v: number | null) => void; decimal?: boolean; placeholder?: string }) {
  const [text, setText] = useState(value == null ? '' : fmtKg(value));
  useEffect(() => {
    if (parseNum(text) !== value) setText(value == null ? '' : fmtKg(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className="num-input"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(parseNum(t));
      }}
    />
  );
}

export function WorkoutEditor({ id }: { id: string }) {
  const original = useLiveQuery(() => db.workouts.get(id), [id]);
  const exMap = useExerciseMap();
  const [w, setW] = useState<Workout | null>(null);
  const [picking, setPicking] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (original && !w) setW(structuredClone(original));
  }, [original, w]);

  if (!w) return <Page title="Editar entreno" back />;

  const edit = (fn: (d: Workout) => void) => {
    setW((cur) => {
      const next = structuredClone(cur!);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const editSet = (eid: string, sid: string, patch: Partial<WorkoutSet>) =>
    edit((d) => Object.assign(d.exercises.find((e) => e.id === eid)!.sets.find((s) => s.id === sid)!, patch));

  const durationMin = Math.round(((w.endedAt ?? w.startedAt) - w.startedAt) / 60000);

  const save = async () => {
    const out = structuredClone(w);
    out.exercises = out.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps != null && s.reps > 0).map((s) => ({ ...s, done: true })) }))
      .filter((e) => e.sets.length);
    out.exerciseIds = [...new Set(out.exercises.map((e) => e.exerciseId))];
    out.name = out.name.trim() || 'Entreno';
    await db.workouts.put(out);
    toast('Entreno guardado', { tone: 'success' });
    pop();
  };

  const cancel = async () => {
    if (dirty && !(await confirm({ title: '¿Descartar cambios?', confirmText: 'Descartar', destructive: true }))) return;
    pop();
  };

  return (
    <Page
      title="Editar entreno"
      back="Cancelar"
      onBack={cancel}
      right={
        <button className="link-btn is-bold" onClick={save}>
          Guardar
        </button>
      }
    >
      <div className="form">
        <label className="field">
          <span className="field__label">Nombre</span>
          <input className="input" value={w.name} onChange={(e) => edit((d) => void (d.name = e.target.value))} />
        </label>
        <div className="field-row">
          <label className="field" style={{ flex: 1 }}>
            <span className="field__label">Inicio</span>
            <input
              className="input"
              type="datetime-local"
              value={toLocalInput(w.startedAt)}
              onChange={(e) => {
                const t = new Date(e.target.value).getTime();
                if (!Number.isFinite(t)) return;
                edit((d) => {
                  const dur = (d.endedAt ?? d.startedAt) - d.startedAt;
                  d.startedAt = t;
                  d.endedAt = t + dur;
                });
              }}
            />
          </label>
          <div className="field">
            <span className="field__label">Minutos</span>
            <Stepper
              value={durationMin}
              min={1}
              max={600}
              step={5}
              onChange={(v) => edit((d) => void (d.endedAt = d.startedAt + v * 60000))}
            />
          </div>
        </div>
        <label className="field">
          <span className="field__label">Notas</span>
          <textarea className="input textarea" rows={2} value={w.notes ?? ''} placeholder="Cómo te has sentido, sueño…" onChange={(e) => edit((d) => void (d.notes = e.target.value))} />
        </label>
      </div>

      {w.exercises.map((e) => {
        const ex = exMap.get(e.exerciseId);
        let n = 0;
        return (
          <div key={e.id} className="we-ex">
            <div className="we-ex__head">
              {ex && <MuscleBadge ex={ex} />}
              <span className="wd-ex__name">{ex?.name}</span>
              <button
                className="icon-btn icon-btn--muted"
                aria-label="Quitar ejercicio"
                onClick={() => edit((d) => void (d.exercises = d.exercises.filter((x) => x.id !== e.id)))}
              >
                <X size={20} />
              </button>
            </div>
            <div className="we-grid we-grid--head">
              <span>Serie</span>
              <span>kg</span>
              <span>Reps</span>
              <span>RIR</span>
              <span />
            </div>
            {e.sets.map((s) => (
              <div key={s.id} className="we-grid">
                <button
                  className={`set-badge ${s.type === 'warmup' ? 'is-warmup' : ''}`}
                  onClick={() => editSet(e.id, s.id, { type: s.type === 'warmup' ? 'working' : 'warmup' })}
                  aria-label="Cambiar tipo de serie"
                >
                  {s.type === 'warmup' ? 'C' : ++n}
                </button>
                <NumInput decimal value={s.weight} onChange={(v) => editSet(e.id, s.id, { weight: v })} placeholder="—" />
                <NumInput value={s.reps} onChange={(v) => editSet(e.id, s.id, { reps: v == null ? null : Math.round(v) })} placeholder="—" />
                <NumInput decimal value={s.rir} onChange={(v) => editSet(e.id, s.id, { rir: v })} placeholder="—" />
                <button
                  className="icon-btn icon-btn--muted"
                  aria-label="Quitar serie"
                  onClick={() => edit((d) => {
                    const x = d.exercises.find((y) => y.id === e.id)!;
                    x.sets = x.sets.filter((y) => y.id !== s.id);
                  })}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            <button
              className="add-set"
              onClick={() =>
                edit((d) => {
                  const x = d.exercises.find((y) => y.id === e.id)!;
                  const last = x.sets[x.sets.length - 1];
                  x.sets.push({ id: uid(), type: 'working', weight: last?.weight ?? null, reps: last?.reps ?? null, rir: last?.rir ?? null, done: true });
                })
              }
            >
              <Plus size={17} /> Añadir serie
            </button>
          </div>
        );
      })}
      <div className="form">
        <button className="btn btn--tinted btn--block" onClick={() => setPicking(true)}>
          <Plus size={20} /> Añadir ejercicios
        </button>
        <p className="hint">Toca el número de la serie para cambiar entre calentamiento (C) y efectiva.</p>
      </div>
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ids) =>
          edit((d) =>
            d.exercises.push(
              ...ids.map((eid) => ({ id: uid(), exerciseId: eid, sets: [{ id: uid(), type: 'working' as const, weight: null, reps: null, rir: null, done: true }] })),
            ),
          )
        }
      />
    </Page>
  );
}
