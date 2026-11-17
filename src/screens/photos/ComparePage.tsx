import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Photo, PhotoAngle } from '../../db/types';
import { Page } from '../../ui/Page';
import { Chip, Segmented } from '../../ui/controls';
import { useObjectURL } from '../../ui/useObjectURL';
import { fmtDateShort, fmtKg } from '../../lib/format';
import { ANGLE_LABEL } from '../../db/labels';

function PhotoImg({ photo, className }: { photo?: Photo; className?: string }) {
  const url = useObjectURL(photo?.blob);
  if (!photo) return <div className={`cmp-empty ${className ?? ''}`}>Sin foto</div>;
  return <img className={className} src={url} alt="" draggable={false} />;
}

const toTs = (d: string) => new Date(d + 'T12:00:00').getTime();

export function ComparePage() {
  const photos = useLiveQuery(() => db.photos.toArray(), []);
  const body = useLiveQuery(() => db.bodyMetrics.toArray(), []);
  const [angle, setAngle] = useState<PhotoAngle>('frente');
  const [mode, setMode] = useState<'side' | 'slider'>('side');
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [split, setSplit] = useState(50);
  const stage = useRef<HTMLDivElement>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, Photo>();
    for (const p of (photos ?? []).filter((p) => p.angle === angle).sort((x, y) => x.createdAt - y.createdAt)) m.set(p.date, p);
    return m;
  }, [photos, angle]);
  const dates = [...byDate.keys()].sort();

  useEffect(() => {
    if (!dates.length) return;
    if (!a || !byDate.has(a)) setA(dates[0]);
    if (!b || !byDate.has(b)) setB(dates[dates.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDate]);

  const weightOn = (d: string | null) => {
    if (!d || !body) return undefined;
    const t = toTs(d);
    const near = body
      .filter((m) => m.weight != null && Math.abs(toTs(m.date) - t) <= 4 * 86400000)
      .sort((x, y) => Math.abs(toTs(x.date) - t) - Math.abs(toTs(y.date) - t))[0];
    return near?.weight;
  };
  const wa = weightOn(a);
  const wb = weightOn(b);
  const days = a && b ? Math.round((toTs(b) - toTs(a)) / 86400000) : 0;

  const onSlide = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)));
  };

  const DateChips = ({ value, onChange }: { value: string | null; onChange: (d: string) => void }) => (
    <div className="chips-scroll">
      {dates.map((d) => (
        <Chip key={d} active={value === d} onClick={() => onChange(d)}>
          {fmtDateShort(toTs(d))}
        </Chip>
      ))}
    </div>
  );

  return (
    <Page title="Comparar" back="Fotos">
      <div className="section cmp-controls">
        <Segmented
          value={angle}
          onChange={setAngle}
          options={(['frente', 'perfil', 'espalda'] as PhotoAngle[]).map((x) => ({ value: x, label: ANGLE_LABEL[x] }))}
        />
      </div>

      {dates.length < 2 ? (
        <p className="muted" style={{ padding: 24, textAlign: 'center' }}>
          Necesitas fotos de {ANGLE_LABEL[angle].toLowerCase()} en al menos dos fechas distintas.
        </p>
      ) : (
        <>
          <div className="cmp-summary">
            <span>
              <b>{days}</b> días
            </span>
            {wa != null && wb != null && (
              <span>
                {fmtKg(wa)} → {fmtKg(wb)} kg{' '}
                <b>
                  ({wb - wa > 0 ? '+' : wb - wa < 0 ? '−' : ''}
                  {fmtKg(Math.abs(Math.round((wb - wa) * 10) / 10))})
                </b>
              </span>
            )}
          </div>

          {mode === 'side' ? (
            <div className="cmp-side">
              <figure>
                <PhotoImg photo={a ? byDate.get(a) : undefined} />
                <figcaption>Antes · {a && fmtDateShort(toTs(a))}</figcaption>
              </figure>
              <figure>
                <PhotoImg photo={b ? byDate.get(b) : undefined} />
                <figcaption>Después · {b && fmtDateShort(toTs(b))}</figcaption>
              </figure>
            </div>
          ) : (
            <div
              className="cmp-slider"
              ref={stage}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                onSlide(e);
              }}
              onPointerMove={(e) => e.buttons && onSlide(e)}
            >
              <PhotoImg photo={b ? byDate.get(b) : undefined} className="cmp-slider__img" />
              <div className="cmp-slider__before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                <PhotoImg photo={a ? byDate.get(a) : undefined} className="cmp-slider__img" />
              </div>
              <div className="cmp-slider__bar" style={{ left: `${split}%` }}>
                <span />
              </div>
              <span className="cmp-slider__tag cmp-slider__tag--l">Antes</span>
              <span className="cmp-slider__tag cmp-slider__tag--r">Después</span>
            </div>
          )}

          <div className="section" style={{ marginTop: 14 }}>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'side', label: 'Lado a lado' },
                { value: 'slider', label: 'Deslizar' },
              ]}
            />
          </div>
          <div className="group-title">Antes</div>
          <div className="section">
            <DateChips value={a} onChange={setA} />
          </div>
          <div className="group-title">Después</div>
          <div className="section">
            <DateChips value={b} onChange={setB} />
          </div>
        </>
      )}
    </Page>
  );
}
