import { MUSCLES, MUSCLE_LABEL } from '../../db/labels';
import type { Muscle } from '../../db/types';
import { Chip } from '../../ui/controls';

export function MuscleFilter({ value, onChange }: { value: Muscle | null; onChange: (m: Muscle | null) => void }) {
  return (
    <div className="chips-scroll">
      <Chip active={value === null} onClick={() => onChange(null)}>
        Todos
      </Chip>
      {MUSCLES.map((m) => (
        <Chip key={m} active={value === m} onClick={() => onChange(value === m ? null : m)}>
          {MUSCLE_LABEL[m]}
        </Chip>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Buscar' }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <div className="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoCorrect="off"
        autoCapitalize="off"
        enterKeyHint="search"
      />
      {value && (
        <button className="search__clear" onClick={() => onChange('')} aria-label="Borrar">
          ×
        </button>
      )}
    </div>
  );
}
