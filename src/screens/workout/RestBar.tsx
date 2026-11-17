import { useWorkout } from '../../state/workout';
import { useNow } from './useNow';
import { fmtClock } from '../../lib/format';
import { adjustRest, skipRest } from './actions';

export function RestBar() {
  const rest = useWorkout((s) => s.workout?.rest);
  const now = useNow(!!rest, 250);
  const visible = !!rest && rest.endsAt > now;
  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;
  const pct = rest ? Math.min(1, Math.max(0, 1 - remaining / rest.duration)) : 0;
  return (
    <div className={`restbar ${visible ? 'is-open' : ''}`}>
      <div className="restbar__inner">
        <div className="restbar__progress" style={{ transform: `scaleX(${pct})` }} />
        <button className="restbar__btn" onClick={() => adjustRest(-15)}>
          −15
        </button>
        <div className="restbar__center">
          <span className="restbar__label">Descanso</span>
          <span className="restbar__time">{fmtClock(Math.ceil(remaining))}</span>
        </div>
        <button className="restbar__btn" onClick={() => adjustRest(15)}>
          +15
        </button>
        <button className="restbar__btn restbar__btn--skip" onClick={skipRest}>
          Saltar
        </button>
      </div>
    </div>
  );
}
