import { memo, useEffect, useRef } from 'react';
import { Check, Trophy } from 'lucide-react';
import type { WorkoutSet } from '../../db/types';
import { fmtKg, fmtSet } from '../../lib/format';
import { SwipeRow } from '../../ui/SwipeRow';
import { closeKeypad, focusField, useKeypad, type Field } from './keypad';
import { removeSet, toggleSetDone } from './actions';

interface Props {
  exId: string;
  set: WorkoutSet;
  label: string;
  /** Serie equivalente de la sesión anterior (columna "Anterior"). */
  prev?: WorkoutSet;
  /** Valor sugerido que se usa si completas la serie sin escribir nada. */
  ph?: WorkoutSet;
  onBadge: () => void;
  isPR?: boolean;
}

function Cell({ exId, set, field, ph: phSet }: { exId: string; set: WorkoutSet; field: Field; ph?: WorkoutSet }) {
  const focused = useKeypad((s) => s.focus?.setId === set.id && s.focus.field === field);
  const raw = useKeypad((s) => (s.focus?.setId === set.id && s.focus.field === field ? s.raw : null));
  const fresh = useKeypad((s) => s.fresh);
  const disabled = field === 'rir' && set.type === 'warmup';
  const value = set[field];
  const ph = phSet?.[field];

  let content: string;
  let isPlaceholder = false;
  if (focused) content = raw ?? '';
  else if (value != null) content = fmtKg(value);
  else if (ph != null && !disabled) {
    content = fmtKg(ph);
    isPlaceholder = true;
  } else content = disabled ? '—' : '';

  return (
    <button
      className={`cell ${focused ? 'is-focused' : ''} ${isPlaceholder ? 'is-ph' : ''} ${focused && fresh && raw ? 'is-selected' : ''}`}
      disabled={disabled}
      onClick={() => focusField({ exId, setId: set.id, field })}
    >
      {focused && !raw && ph != null ? <span className="cell__ghost">{fmtKg(ph)}</span> : content}
      {focused && <span className="caret" />}
    </button>
  );
}

export const SetRow = memo(function SetRow({ exId, set, label, prev, ph, onBadge, isPR }: Props) {
  const rowFocused = useKeypad((s) => s.focus?.setId === set.id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rowFocused) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [rowFocused]);

  return (
    <SwipeRow onDelete={() => removeSet(exId, set.id)}>
      <div ref={ref} className={`set-row ${set.done ? 'is-done' : ''} ${rowFocused ? 'is-active' : ''}`}>
        <button className={`set-badge ${set.type === 'warmup' ? 'is-warmup' : ''}`} onClick={onBadge}>
          {label}
        </button>
        <div className="set-prev">{prev ? fmtSet(prev.weight, prev.reps, set.type === 'warmup' ? null : prev.rir) : '—'}</div>
        <Cell exId={exId} set={set} field="weight" ph={ph} />
        <Cell exId={exId} set={set} field="reps" ph={ph} />
        <Cell exId={exId} set={set} field="rir" ph={ph} />
        <button
          className={`set-check ${set.done ? 'is-on' : ''} ${isPR ? 'is-pr' : ''}`}
          onClick={() =>
            void toggleSetDone(exId, set.id).then((ok) => {
              if (ok && useKeypad.getState().focus?.setId === set.id) closeKeypad();
            })
          }
          aria-label={set.done ? 'Desmarcar serie' : 'Completar serie'}
        >
          {isPR && set.done ? <Trophy size={19} strokeWidth={2.6} /> : <Check size={20} strokeWidth={3} />}
        </button>
      </div>
    </SwipeRow>
  );
});
