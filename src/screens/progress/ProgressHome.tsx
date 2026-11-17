import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, ChartLine, ChevronLeft, ChevronRight, Equal, Scale } from 'lucide-react';
import { Page } from '../../ui/Page';
import { Empty } from '../../ui/controls';
import { useHistory } from '../../db/useHistory';
import { useExerciseMap } from '../../db/hooks';
import { db } from '../../db/db';
import { addWeeks, exerciseHistory, inRange, muscleSets, weekStart } from '../../lib/stats';
import { workoutVolume, workoutWorkingSets } from '../../lib/calc';
import { fmt1, fmtDateShort, fmtKg, fmtVolume } from '../../lib/format';
import { BarChart } from '../../charts/BarChart';
import { Sparkline } from '../../charts/Sparkline';
import { MUSCLES, MUSCLE_LABEL } from '../../db/labels';
import { push } from '../../nav/nav';
import { ExerciseProgress } from './ExerciseProgress';
import { BodyPage } from './BodyPage';
import { MuscleBadge } from '../train/ExerciseRow';
import { seriesFor } from './body';

function Delta({ cur, prev, fmt = (n: number) => fmtKg(n) }: { cur: number; prev: number; fmt?: (n: number) => string }) {
  if (!prev && !cur) return null;
  const d = cur - prev;
  const Icon = d > 0 ? ArrowUp : d < 0 ? ArrowDown : Equal;
  return (
    <span className={`delta delta--${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}`}>
      <Icon size={11} strokeWidth={3} />
      {d !== 0 && fmt(Math.abs(d))}
    </span>
  );
}

export function ProgressHome() {
  const hist = useHistory();
  const exMap = useExerciseMap();
  const body = useLiveQuery(() => db.bodyMetrics.toArray(), []);
  const thisWeek = weekStart(Date.now());
  const [week, setWeek] = useState(thisWeek);

  const summary = useMemo(() => {
    if (!hist) return null;
    const cur = inRange(hist.asc, thisWeek, addWeeks(thisWeek, 1));
    // Comparación justa: la semana pasada solo hasta el mismo momento de la semana.
    const elapsed = Date.now() - thisWeek;
    const prev = inRange(hist.asc, addWeeks(thisWeek, -1), addWeeks(thisWeek, -1) + elapsed);
    const agg = (ws: typeof cur) => ({
      n: ws.length,
      sets: ws.reduce((a, w) => a + workoutWorkingSets(w), 0),
      vol: ws.reduce((a, w) => a + workoutVolume(w), 0),
    });
    const bars = Array.from({ length: 8 }, (_, i) => {
      const ws = addWeeks(thisWeek, i - 7);
      const list = inRange(hist.asc, ws, addWeeks(ws, 1));
      const sets = list.reduce((a, w) => a + workoutWorkingSets(w), 0);
      return {
        label: fmtDateShort(ws),
        value: sets,
        tip: `Semana del ${fmtDateShort(ws)}: ${sets} series · ${list.length} entrenos`,
        highlight: i === 7,
      };
    });
    return { cur: agg(cur), prev: agg(prev), bars };
  }, [hist, thisWeek]);

  const muscles = useMemo(() => {
    if (!hist) return [];
    const map = muscleSets(inRange(hist.asc, week, addWeeks(week, 1)), exMap);
    return MUSCLES.map((m) => ({ m, v: map.get(m) ?? 0 })).sort((a, b) => b.v - a.v);
  }, [hist, exMap, week]);
  const maxMuscle = Math.max(10, ...muscles.map((x) => x.v));

  const exercises = useMemo(() => {
    if (!hist) return [];
    const ids = new Map<string, number>();
    for (const w of hist.asc) for (const e of w.exercises) ids.set(e.exerciseId, w.startedAt);
    return [...ids.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => {
        const h = exerciseHistory(hist.asc, id);
        const weighted = h.some((x) => x.stats.maxWeight > 0);
        const vals = h.map((x) => (weighted ? x.stats.bestE1rm : x.stats.totalReps));
        return { id, vals, weighted, last: h[h.length - 1] };
      })
      .filter((x) => x.vals.length > 0);
  }, [hist]);

  const weightPts = seriesFor(body ?? [], 'weight');
  const lastW = weightPts[weightPts.length - 1];

  if (hist && hist.asc.length === 0 && body && body.length === 0) {
    return (
      <Page title="Progreso" large>
        <Empty icon={<ChartLine size={30} />} title="Aún no hay datos" text="Termina entrenos o registra tu peso para ver aquí tu progreso." />
        <div className="form">
          <button className="btn btn--tinted btn--block" onClick={() => push(() => <BodyPage />)}>
            <Scale size={18} /> Registrar peso corporal
          </button>
        </div>
      </Page>
    );
  }

  const weekLabel = week === thisWeek ? 'Esta semana' : week === addWeeks(thisWeek, -1) ? 'Semana pasada' : `Semana del ${fmtDateShort(week)}`;
  const untrained = muscles.filter((x) => x.v === 0);

  return (
    <Page title="Progreso" large>
      {summary && (
        <div className="kpis">
          <div className="kpi">
            <span className="kpi__label">Entrenos</span>
            <span className="kpi__value">{summary.cur.n}</span>
            <Delta cur={summary.cur.n} prev={summary.prev.n} />
          </div>
          <div className="kpi">
            <span className="kpi__label">Series</span>
            <span className="kpi__value">{summary.cur.sets}</span>
            <Delta cur={summary.cur.sets} prev={summary.prev.sets} />
          </div>
          <div className="kpi">
            <span className="kpi__label">Volumen</span>
            <span className="kpi__value">{fmtVolume(summary.cur.vol)}</span>
            <Delta cur={summary.cur.vol} prev={summary.prev.vol} fmt={fmtVolume} />
          </div>
        </div>
      )}
      <p className="hint group-hint" style={{ marginTop: 0 }}>
        Esta semana frente a la pasada hasta el mismo día. Volumen = kg × reps de las series efectivas.
      </p>

      {summary && (
        <>
          <div className="section-head">
            <h2>Series efectivas por semana</h2>
          </div>
          <div className="chart-card">
            <BarChart bars={summary.bars} />
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Series por músculo</h2>
      </div>
      <div className="chart-card">
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setWeek((w) => addWeeks(w, -1))} aria-label="Semana anterior">
            <ChevronLeft size={22} />
          </button>
          <span>{weekLabel}</span>
          <button className="icon-btn" disabled={week >= thisWeek} onClick={() => setWeek((w) => addWeeks(w, 1))} aria-label="Semana siguiente">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="mbars">
          {muscles
            .filter((x) => x.v > 0)
            .map(({ m, v }) => (
              <div key={m} className="mbar">
                <span className="mbar__label">{MUSCLE_LABEL[m]}</span>
                <span className="mbar__track">
                  <span className="mbar__fill" style={{ width: `${(v / maxMuscle) * 100}%` }} />
                  {maxMuscle >= 10 && <span className="mbar__mark" style={{ left: `${(10 / maxMuscle) * 100}%` }} />}
                  {maxMuscle >= 20 && <span className="mbar__mark" style={{ left: `${(20 / maxMuscle) * 100}%` }} />}
                </span>
                <span className="mbar__val">{fmt1(v)}</span>
              </div>
            ))}
          {untrained.length === MUSCLES.length && <p className="muted" style={{ textAlign: 'center', padding: 12 }}>Sin series efectivas esta semana</p>}
        </div>
        {untrained.length > 0 && untrained.length < MUSCLES.length && (
          <p className="hint" style={{ padding: '0 4px' }}>
            Sin trabajar: {untrained.map((x) => MUSCLE_LABEL[x.m]).join(', ')}.
          </p>
        )}
        <p className="hint" style={{ padding: '0 4px' }}>
          Cada serie cuenta 1 para el músculo principal y 0,5 para los secundarios. Las marcas verticales señalan 10 y 20 series.
        </p>
      </div>

      <div className="section-head">
        <h2>Cuerpo</h2>
      </div>
      <button className="chart-card body-card" onClick={() => push(() => <BodyPage />)}>
        <span className="group__icon group__icon--purple">
          <Scale size={18} />
        </span>
        <span className="body-card__text">
          <span className="body-card__title">Peso corporal y medidas</span>
          <span className="muted">{lastW ? `${fmtKg(lastW.y)} kg · ${fmtDateShort(lastW.x)}` : 'Añade tu primer registro'}</span>
        </span>
        <Sparkline values={weightPts.slice(-12).map((p) => p.y)} />
        <ChevronRight size={18} className="muted" />
      </button>

      {exercises.length > 0 && (
        <>
          <div className="section-head">
            <h2>Ejercicios</h2>
          </div>
          <div className="group">
            {exercises.map(({ id, vals, weighted, last }) => {
              const ex = exMap.get(id);
              const prev = vals[vals.length - 2];
              const cur = vals[vals.length - 1];
              const trend = prev == null ? null : cur > prev * 1.004 ? 'up' : cur < prev * 0.996 ? 'down' : 'same';
              return (
                <button key={id} className="group__row group__row--link prog-row" onClick={() => push(() => <ExerciseProgress id={id} />)}>
                  {ex && <MuscleBadge ex={ex} />}
                  <span className="prog-row__text">
                    <span className="prog-row__name">{ex?.name}</span>
                    <span className="muted prog-row__meta">
                      {weighted ? `1RM est. ${fmtKg(Math.round(cur))} kg` : `${cur} reps`} · {fmtDateShort(last.workout.startedAt)}
                    </span>
                  </span>
                  <Sparkline values={vals.slice(-10)} width={56} />
                  {trend && (
                    <span className={`trend trend--${trend}`}>
                      {trend === 'up' ? <ArrowUp size={13} /> : trend === 'down' ? <ArrowDown size={13} /> : <Equal size={13} />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}
