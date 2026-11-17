import { useEffect, useState } from 'react';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import { Chip, Segmented } from '../../ui/controls';
import { EQUIPMENT, EQUIPMENT_LABEL, MUSCLES, MUSCLE_LABEL } from '../../db/labels';
import type { Equipment, Exercise, Mechanic, Muscle } from '../../db/types';
import { db } from '../../db/db';
import { uid } from '../../lib/id';
import { fmtKg } from '../../lib/format';
import { toast } from '../../ui/uiStore';

const INCREMENTS = [undefined, 1, 1.25, 2, 2.5, 5] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise;
  onSaved?: (ex: Exercise) => void;
  initialName?: string;
}

export function ExerciseForm({ open, onClose, exercise, onSaved, initialName }: Props) {
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<Muscle | null>(null);
  const [secondary, setSecondary] = useState<Muscle[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('barra');
  const [mechanic, setMechanic] = useState<Mechanic>('compuesto');
  const [increment, setIncrement] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(exercise?.name ?? initialName ?? '');
    setPrimary(exercise?.primary ?? null);
    setSecondary(exercise?.secondary ?? []);
    setEquipment(exercise?.equipment ?? 'barra');
    setMechanic(exercise?.mechanic ?? 'compuesto');
    setIncrement(exercise?.increment);
    setNotes(exercise?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise]);

  const valid = name.trim().length > 0 && primary !== null;

  const save = async () => {
    if (!valid || !primary) return;
    const now = Date.now();
    const ex: Exercise = {
      ...(exercise ?? { id: uid(), createdAt: now }),
      name: name.trim(),
      primary,
      secondary: secondary.filter((m) => m !== primary),
      equipment,
      mechanic,
      increment,
      notes: notes.trim(),
      updatedAt: now,
    } as Exercise;
    await db.exercises.put(ex);
    toast(exercise ? 'Ejercicio actualizado' : 'Ejercicio creado', { tone: 'success' });
    onSaved?.(ex);
    onClose();
  };

  const toggleSecondary = (m: Muscle) =>
    setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));

  return (
    <Sheet open={open} onClose={onClose} size="full">
      <SheetHeader
        title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn is-bold" disabled={!valid} onClick={save}>
            Guardar
          </button>
        }
      />
      <div className="sheet-scroll form">
        <label className="field">
          <span className="field__label">Nombre</span>
          <input
            className="input"
            value={name}
            placeholder="Ej.: Press banca"
            onChange={(e) => setName(e.target.value)}
            autoCapitalize="sentences"
            enterKeyHint="done"
          />
        </label>

        <div className="field">
          <span className="field__label">Grupo muscular principal</span>
          <div className="chips-wrap">
            {MUSCLES.map((m) => (
              <Chip key={m} active={primary === m} onClick={() => setPrimary(m)}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Secundarios</span>
          <div className="chips-wrap">
            {MUSCLES.filter((m) => m !== primary).map((m) => (
              <Chip key={m} tone="secondary" active={secondary.includes(m)} onClick={() => toggleSecondary(m)}>
                {MUSCLE_LABEL[m]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Material</span>
          <div className="chips-wrap">
            {EQUIPMENT.map((eq) => (
              <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>
                {EQUIPMENT_LABEL[eq]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Tipo</span>
          <Segmented
            value={mechanic}
            onChange={setMechanic}
            options={[
              { value: 'compuesto', label: 'Compuesto' },
              { value: 'aislamiento', label: 'Aislamiento' },
            ]}
          />
        </div>

        <div className="field">
          <span className="field__label">Incremento de peso</span>
          <div className="chips-wrap">
            {INCREMENTS.map((inc) => (
              <Chip key={String(inc)} active={increment === inc} onClick={() => setIncrement(inc)}>
                {inc === undefined ? 'Por defecto' : `${fmtKg(inc)} kg`}
              </Chip>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Notas</span>
          <textarea
            className="input textarea"
            rows={4}
            value={notes}
            placeholder="Ajustes de la máquina, técnica, agarre…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
    </Sheet>
  );
}
