import { useMemo, useState } from 'react';
import { Plus, Dumbbell } from 'lucide-react';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/controls';
import { norm, useLibrary } from '../../db/hooks';
import type { Muscle } from '../../db/types';
import { MuscleFilter, SearchBox } from './MuscleFilter';
import { ExerciseRow } from './ExerciseRow';
import { ExerciseForm } from './ExerciseForm';
import { push } from '../../nav/nav';
import { ExerciseDetail } from './ExerciseDetail';

export function Library() {
  const list = useLibrary();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return (list ?? []).filter(
      (e) => (!muscle || e.primary === muscle || e.secondary.includes(muscle)) && (!nq || norm(e.name).includes(nq)),
    );
  }, [list, q, muscle]);

  return (
    <Page
      title="Ejercicios"
      back="Entrenar"
      right={
        <button className="icon-btn" onClick={() => setCreating(true)} aria-label="Nuevo ejercicio">
          <Plus size={24} />
        </button>
      }
      sub={
        <>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar ejercicio" />
          <MuscleFilter value={muscle} onChange={setMuscle} />
        </>
      }
    >
      <div className="list-plain">
        {filtered.map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} onClick={() => push(() => <ExerciseDetail id={ex.id} />)} />
        ))}
      </div>
      {list && filtered.length === 0 && (
        <Empty
          icon={<Dumbbell size={30} />}
          title="Sin resultados"
          text="Prueba con otro nombre o crea el ejercicio."
          action={
            <button className="btn btn--tinted" onClick={() => setCreating(true)}>
              Crear ejercicio
            </button>
          }
        />
      )}
      <div className="list-count">{list ? `${filtered.length} ejercicios` : ''}</div>
      <ExerciseForm open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
