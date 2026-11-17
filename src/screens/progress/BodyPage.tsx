import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Scale } from 'lucide-react';
import { db } from '../../db/db';
import type { BodyMetric } from '../../db/types';
import { Page } from '../../ui/Page';
import { Chip, Empty } from '../../ui/controls';
import { LineChart } from '../../charts/LineChart';
import { BODY_FIELDS, movingAverage, seriesFor, type BodyKey } from './body';
import { BodyEntrySheet } from './BodyEntrySheet';
import { fmtDateShort, fmtKg } from '../../lib/format';

export function BodyPage() {
  const list = useLiveQuery(() => db.bodyMetrics.toArray(), []);
  const [key, setKey] = useState<BodyKey>('weight');
  const [editing, setEditing] = useState<BodyMetric | null | undefined>(undefined);
  const field = BODY_FIELDS.find((f) => f.key === key)!;
  const pts = useMemo(() => seriesFor(list ?? [], key), [list, key]);
  const available = BODY_FIELDS.filter((f) => f.key === 'weight' || (list ?? []).some((m) => m[f.key] != null));
  const last = pts[pts.length - 1];
  const monthAgo = last ? [...pts].reverse().find((p) => p.x <= last.x - 28 * 86400000) ?? pts[0] : undefined;
  const delta = last && monthAgo && monthAgo !== last ? last.y - monthAgo.y : null;
  const sorted = [...(list ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Page
      title="Cuerpo"
      back="Progreso"
      right={
        <button className="icon-btn" onClick={() => setEditing(null)} aria-label="Nuevo registro">
          <Plus size={24} />
        </button>
      }
    >
      {list && list.length === 0 ? (
        <Empty
          icon={<Scale size={30} />}
          title="Registra tu peso"
          text="Pésate en condiciones parecidas (por la mañana, en ayunas) para que la tendencia sea fiable."
          action={
            <button className="btn btn--primary" onClick={() => setEditing(null)}>
              Añadir registro
            </button>
          }
        />
      ) : (
        <>
          <div className="section" style={{ paddingTop: 8 }}>
            <div className="chips-scroll">
              {available.map((f) => (
                <Chip key={f.key} active={key === f.key} onClick={() => setKey(f.key)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div className="chart-card__head">
              <div>
                <div className="chart-card__value">
                  {last ? fmtKg(last.y) : '—'} <small>{field.unit}</small>
                </div>
                <div className="chart-card__sub">{last ? `${field.label} · ${fmtDateShort(last.x)}` : 'Sin datos'}</div>
              </div>
              {delta != null && (
                <span className="trend trend--same">
                  {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                  {fmtKg(Math.abs(Math.round(delta * 10) / 10))} {field.unit} en 4 sem.
                </span>
              )}
            </div>
            {pts.length > 0 && (
              <LineChart
                series={
                  key === 'weight' && pts.length >= 4
                    ? [
                        { name: 'Peso', points: pts },
                        { name: 'Media 7 días', points: movingAverage(pts), muted: true },
                      ]
                    : [{ name: field.label, points: pts }]
                }
                unit={field.unit}
                fmtY={(v) => fmtKg(Math.round(v * 10) / 10)}
              />
            )}
          </div>

          <div className="group-title">Registros</div>
          <div className="group">
            {sorted.map((m) => (
              <button key={m.id} className="group__row group__row--link body-row" onClick={() => setEditing(m)}>
                <span className="body-row__date">{fmtDateShort(new Date(m.date + 'T12:00:00'))}</span>
                <span className="body-row__vals">
                  {BODY_FIELDS.filter((f) => m[f.key] != null)
                    .map((f) => `${f.key === 'weight' ? '' : f.label + ' '}${fmtKg(m[f.key] as number)} ${f.unit}`)
                    .join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <BodyEntrySheet open={editing !== undefined} entry={editing} onClose={() => setEditing(undefined)} />
    </Page>
  );
}
