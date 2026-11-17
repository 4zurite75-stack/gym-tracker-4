import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../../db/labels';
import type { Exercise } from '../../db/types';
import { Check, ChevronRight } from 'lucide-react';

export function MuscleBadge({ ex }: { ex: Exercise }) {
  return <span className={`mbadge mbadge--${ex.primary}`}>{ex.name.trim().charAt(0).toUpperCase()}</span>;
}

export function ExerciseRow({
  ex,
  onClick,
  selected,
  selectable,
}: {
  ex: Exercise;
  onClick: () => void;
  selected?: boolean;
  selectable?: boolean;
}) {
  return (
    <button className={`ex-row ${selected ? 'is-selected' : ''}`} onClick={onClick}>
      <MuscleBadge ex={ex} />
      <span className="ex-row__text">
        <span className="ex-row__name">{ex.name}</span>
        <span className="ex-row__meta">
          {MUSCLE_LABEL[ex.primary]} · {EQUIPMENT_LABEL[ex.equipment]}
        </span>
      </span>
      {selectable ? (
        <span className={`check ${selected ? 'is-on' : ''}`}>{selected && <Check size={15} strokeWidth={3} />}</span>
      ) : (
        <ChevronRight size={18} className="ex-row__chev" />
      )}
    </button>
  );
}
