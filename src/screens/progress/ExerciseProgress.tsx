import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { db } from '../../db/db';
import { useHistory } from '../../db/useHistory';
import { exerciseHistory, recordsFor, PR_LABEL, type PRType } from '../../lib/stats';
import { Page } from '../../ui/Page';
import { Chip, Empty, Segmented } from '../../ui/controls';
import { LineChart } from '../../charts/LineChart';
import { fmtDateShort, fmtInt, fmtKg, fmtSet, fmtVolume } from '../../lib/format';
import { isWorkingDone } from '../../lib/calc';
import { ChartLine } from 'lucide-react';

type Metric = 'e1rm' | 'max' | 'volume' | 'reps';
type Range = '3m' | '6m' | '1a' | 'all';
const RANGE_DAYS: Record<Range, number> = { '3m': 92, '6m': 183, '1a': 366, all: Infinity };

function recordText(type: PRType, value: number, set: { weight: number | null; reps: number | null; rir: number | null }) {
  switch (type) {
    case 'e1rm':
      return `${fmtKg(Math.round(value * 10) / 10)} kg`;
    case 'maxWeight':
      return `${fmtKg(value)} kg × ${set.reps}`;
    case 'setVolume':
      return `${fmtKg(set.weight)} kg × ${set.reps}`;
    case 'maxReps':
      return `${value} reps`;
  }
}

export function ExerciseProgress({ id }: { id: string }) {
  const ex = useLiveQuery(() => db.exercises.get(id), [id]);
  const hist = useHistory();
  const history = useMemo(() => (hist ? exerciseHistory(hist.asc, id) : []), [hist, id]);
  const weighted = history.some((h) => h.stats.maxWeight > 0);
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [range, setRange] = useState<Range>('all');
  const m: Metric = weighted ? metric : metric === 'volume' ? 'volume' : 'reps';

  const shown = useMemo(() => {
    const from = Date.now() - RANGE_DAYS[range] * 86400000;
    return history.filter((h) => h.workout.startedAt >= from);
  }, [history, range]);

  const points = shown.map((h) => ({
    x: h.workout.startedAt,
    y:
      m === 'e1rm'
        ? Math.round(h.stats.bestE1rm * 10) / 10
        : m === 'max'
          ? h.stats.maxWeight
          : m === 'volume'
            ? weighted
              ? h.stats.volume
              : h.stats.totalReps
            : Math.max(...h.ex.sets.filter(isWorkingDone).map((s) => s.reps ?? 0)),
  }));

  const records = recordsFor(history);
  const first = points[0]?.y;
  const last = points[points.length - 1]?.y;
  const change = points.length > 1 && first ? ((last - first) / first) * 100 : null;
  const unit = m === 'reps' || (m === 'volume' && !weighted) ? 'reps' : 'kg';

  return (
    <Page title={ex?.name ?? ''} back>
      <div className="wd-head">
        <h2>{ex?.name}</h2>
        <p className="muted">
          {history.length} sesi{history.length === 1 ? 'ón' : 'ones'}
          {history.length > 0 && ` · última ${fmtDateShort(history[history.length - 1].workout.startedAt)}`}
        </p>
      </div>

      {hist && history.length === 0 ? (
        <Empty icon={<ChartLine size={30} />} title="Sin datos todavía" text="Completa series efectivas de este ejercicio para ver tu progreso." />
      ) : (
        <>
          <div className="section">
            <Segmented
              value={m}
              onChange={setMetric}
              options={
                weighted
                  ? [
                      { value: 'e1rm', label: '1RM est.' },
                      { value: 'max', label: 'Peso máx.' },
                      { value: 'volume', label: 'Volumen' },
                    ]
                  : [
                      { value: 'reps', label: 'Reps máx.' },
                      { value: 'volume', label: 'Reps totales' },
                    ]
              }
            />
          </div>
          <div className="chart-card">
            <div className="chart-card__head">
              <div>
                <div className="chart-card__value">
                  {last != null ? (m === 'volume' && weighted ? fmtVolume(last) : fmtKg(last)) : '—'} <small>{unit}</small>
                </div>
                <div className="chart-card__sub">Última sesión</div>
              </div>
              {change != null && (
                <span className={`trend trend--${change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'same'}`}>
                  {change > 0 ? '+' : ''}
                  {fmtKg(Math.round(change * 10) / 10)} %
                </span>
              )}
            </div>
            {points.length > 0 ? (
              <LineChart
                series={[{ name: 'valor', points }]}
                unit={unit}
                fmtY={(v) => (v >= 10000 ? `${fmtInt(v / 1000)}k` : fmtKg(Math.round(v * 10) / 10))}
                detail={(i) => {
                  const b = shown[i]?.stats.bestSet;
                  return b ? `Mejor: ${fmtSet(b.weight, b.reps, b.rir)}` : undefined;
                }}
              />
            ) : (
              <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
                Sin sesiones en este periodo
              </p>
            )}
            <div className="chips-row">
              {(['3m', '6m', '1a', 'all'] as Range[]).map((r) => (
                <Chip key={r} active={range === r} onClick={() => setRange(r)}>
                  {r === 'all' ? 'Todo' : r.toUpperCase()}
                </Chip>
              ))}
            </div>
          </div>
          {m === 'e1rm' && (
            <p className="hint group-hint" style={{ marginTop: -4 }}>
              1RM estimado con Epley usando reps + RIR: 100 kg × 6 @ RIR 2 cuenta como 8 reps al fallo.
            </p>
          )}

          <div className="group-title">Récords personales</div>
          <div className="group">
            {records.map((r) => (
              <div key={r.type} className="group__row">
                <span className="group__icon group__icon--yellow">
                  <Trophy size={16} />
                </span>
                <span className="rec">
                  <span>{PR_LABEL[r.type]}</span>
                  <small className="muted">{fmtDateShort(r.date)}</small>
                </span>
                <span className="group__value rec__value">{recordText(r.type, r.value, r.set)}</span>
              </div>
            ))}
          </div>

          <div className="group-title">Sesiones</div>
          <div className="group">
            {[...history].reverse().map((h) => (
              <div key={h.workout.id} className="group__row session-row">
                <span className="session-row__date">{fmtDateShort(h.workout.startedAt)}</span>
                <span className="session-row__sets">
                  {h.ex.sets
                    .filter(isWorkingDone)
                    .map((s) => fmtSet(s.weight && s.weight > 0 ? s.weight : null, s.reps, s.rir))
                    .join('  ·  ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
