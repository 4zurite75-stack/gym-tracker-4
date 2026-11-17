import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import { norm, useLibrary } from '../../db/hooks';
import type { Muscle } from '../../db/types';
import { MuscleFilter, SearchBox } from './MuscleFilter';
import { ExerciseRow } from './ExerciseRow';
import { ExerciseForm } from './ExerciseForm';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  /** Elegir solo uno (p. ej. para sustituir un ejercicio). */
  single?: boolean;
  title?: string;
}

export function ExercisePicker({ open, onClose, onPick, single, title = 'Añadir ejercicios' }: Props) {
  const list = useLibrary();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setQ('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return (list ?? []).filter(
      (e) => (!muscle || e.primary === muscle || e.secondary.includes(muscle)) && (!nq || norm(e.name).includes(nq)),
    );
  }, [list, q, muscle]);

  const toggle = (id: string) => {
    if (single) {
      onPick([id]);
      onClose();
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Sheet open={open} onClose={onClose} size="full">
      <SheetHeader
        title={title}
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn" onClick={() => setCreating(true)}>
            Crear
          </button>
        }
      />
      <div className="picker-filters">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar ejercicio" />
        <MuscleFilter value={muscle} onChange={setMuscle} />
      </div>
      <div className="sheet-scroll list-plain">
        {filtered.map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} selectable={!single} selected={selected.includes(ex.id)} onClick={() => toggle(ex.id)} />
        ))}
        {list && filtered.length === 0 && (
          <div className="empty">
            <div className="empty__title">Sin resultados</div>
            <button className="btn btn--tinted" onClick={() => setCreating(true)}>
              Crear «{q || 'nuevo ejercicio'}»
            </button>
          </div>
        )}
        <div style={{ height: 96 }} />
      </div>
      {!single && (
        <div className={`picker-cta ${selected.length ? 'is-visible' : ''}`}>
          <button
            className="btn btn--primary btn--block"
            onClick={() => {
              onPick(selected);
              onClose();
            }}
          >
            Añadir {selected.length} ejercicio{selected.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
      <ExerciseForm
        open={creating}
        onClose={() => setCreating(false)}
        initialName={q}
        onSaved={(ex) => (single ? (onPick([ex.id]), onClose()) : setSelected((s) => [...s, ex.id]))}
      />
    </Sheet>
  );
}
