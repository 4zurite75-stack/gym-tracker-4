import { Check, ChevronDown, Delete, Minus, Plus } from 'lucide-react';
import { backspace, closeKeypad, nextField, stepValue, typeComma, typeDigit, useKeypad } from './keypad';
import { toggleSetDone } from './actions';
import { useWorkout } from '../../state/workout';
import { fmtKg } from '../../lib/format';
import { incrementCache } from './keypad';

const LABEL = { weight: 'Peso (kg)', reps: 'Repeticiones', rir: 'RIR (reps en reserva)' } as const;

/** Evita que el botón robe el foco y responde al instante en táctil. */
function Key({ onPress, className = '', children, label }: { onPress: () => void; className?: string; children: React.ReactNode; label?: string }) {
  return (
    <button
      className={`key ${className}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onClick={(e) => {
        // Accesibilidad con teclado/lector: pointerdown ya gestionó el toque.
        if (e.detail === 0) onPress();
      }}
    >
      {children}
    </button>
  );
}

export function Keypad() {
  const focus = useKeypad((s) => s.focus);
  const isWarmup = useWorkout((s) =>
    focus ? s.workout?.exercises.find((e) => e.id === focus.exId)?.sets.find((x) => x.id === focus.setId)?.type === 'warmup' : false,
  );
  const open = !!focus;
  const field = focus?.field ?? 'weight';
  const step = field === 'weight' ? incrementCache.get(focus?.exId ?? '') ?? 2.5 : 1;
  const isLast = field === 'rir' || (isWarmup && field === 'reps');

  return (
    <div className={`keypad ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="keypad__bar">
        <span className="keypad__label">{LABEL[field]}</span>
        <button className="keypad__hide" onClick={closeKeypad} aria-label="Ocultar teclado">
          <ChevronDown size={22} />
        </button>
      </div>
      <div className="keypad__grid">
        {['1', '2', '3'].map((d) => (
          <Key key={d} onPress={() => typeDigit(d)}>
            {d}
          </Key>
        ))}
        <Key className="key--fn" onPress={() => stepValue(-1)} label={`Restar ${fmtKg(step)}`}>
          <Minus size={20} />
          <small>{fmtKg(step)}</small>
        </Key>
        {['4', '5', '6'].map((d) => (
          <Key key={d} onPress={() => typeDigit(d)}>
            {d}
          </Key>
        ))}
        <Key className="key--fn" onPress={() => stepValue(1)} label={`Sumar ${fmtKg(step)}`}>
          <Plus size={20} />
          <small>{fmtKg(step)}</small>
        </Key>
        {['7', '8', '9'].map((d) => (
          <Key key={d} onPress={() => typeDigit(d)}>
            {d}
          </Key>
        ))}
        <Key className="key--fn key--next" onPress={nextField}>
          {isLast ? 'Siguiente serie' : 'Siguiente'}
        </Key>
        <Key className={field === 'reps' ? 'key--disabled' : ''} onPress={typeComma}>
          ,
        </Key>
        <Key onPress={() => typeDigit('0')}>0</Key>
        <Key onPress={backspace} label="Borrar">
          <Delete size={24} />
        </Key>
        <Key
          className="key--done"
          label="Completar serie"
          onPress={() => {
            if (!focus) return;
            void toggleSetDone(focus.exId, focus.setId).then((ok) => ok && closeKeypad());
          }}
        >
          <Check size={22} strokeWidth={3} />
        </Key>
      </div>
    </div>
  );
}
