import { ChevronUp, Timer } from 'lucide-react';
import { useWorkout } from '../../state/workout';
import { useNow } from './useNow';
import { fmtClock } from '../../lib/format';

export function MiniBar() {
  const workout = useWorkout((s) => s.workout);
  const expanded = useWorkout((s) => s.expanded);
  const now = useNow(!!workout && !expanded);
  const show = !!workout && !expanded;
  const rest = workout?.rest && workout.rest.endsAt > now ? (workout.rest.endsAt - now) / 1000 : null;
  return (
    <button className={`minibar ${show ? 'is-visible' : ''}`} onClick={() => useWorkout.getState().setExpanded(true)} tabIndex={show ? 0 : -1}>
      <span className="minibar__pulse" />
      <span className="minibar__text">
        <span className="minibar__name">{workout?.name}</span>
        <span className="minibar__time">{workout ? fmtClock((now - workout.startedAt) / 1000) : ''}</span>
      </span>
      {rest != null && (
        <span className="minibar__rest">
          <Timer size={15} /> {fmtClock(Math.ceil(rest))}
        </span>
      )}
      <ChevronUp size={20} />
    </button>
  );
}
