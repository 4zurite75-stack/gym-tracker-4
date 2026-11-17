import { useEffect, useState } from 'react';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import type { BodyMetric } from '../../db/types';
import { db } from '../../db/db';
import { uid } from '../../lib/id';
import { fmtKg, isoDate } from '../../lib/format';
import { BODY_FIELDS, type BodyKey } from './body';
import { confirm, toast } from '../../ui/uiStore';

type Values = Partial<Record<BodyKey, string>>;

export function BodyEntrySheet({ open, onClose, entry }: { open: boolean; onClose: () => void; entry?: BodyMetric | null }) {
  const [date, setDate] = useState(isoDate());
  const [vals, setVals] = useState<Values>({});

  useEffect(() => {
    if (!open) return;
    setDate(entry?.date ?? isoDate());
    const v: Values = {};
    for (const f of BODY_FIELDS) if (entry?.[f.key] != null) v[f.key] = fmtKg(entry[f.key] as number);
    setVals(v);
  }, [open, entry]);

  const parse = (s?: string) => {
    if (!s) return undefined;
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const hasAny = BODY_FIELDS.some((f) => parse(vals[f.key]) != null);

  const save = async () => {
    const existing = entry ?? (await db.bodyMetrics.where('date').equals(date).first());
    const rec: BodyMetric = { id: existing?.id ?? uid(), date, createdAt: existing?.createdAt ?? Date.now() };
    for (const f of BODY_FIELDS) {
      const v = parse(vals[f.key]);
      if (v != null) rec[f.key] = v;
    }
    await db.bodyMetrics.put(rec);
    toast('Registro guardado', { tone: 'success' });
    onClose();
  };

  const remove = async () => {
    if (!entry) return;
    if (!(await confirm({ title: '¿Eliminar este registro?', confirmText: 'Eliminar', destructive: true }))) return;
    await db.bodyMetrics.delete(entry.id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} size="full">
      <SheetHeader
        title={entry ? 'Editar registro' : 'Nuevo registro'}
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn is-bold" disabled={!hasAny} onClick={save}>
            Guardar
          </button>
        }
      />
      <div className="sheet-scroll form">
        <label className="field">
          <span className="field__label">Fecha</span>
          <input className="input" type="date" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Peso corporal</span>
          <div className="unit-input unit-input--big">
            <input
              inputMode="decimal"
              placeholder="0,0"
              value={vals.weight ?? ''}
              onChange={(e) => setVals((v) => ({ ...v, weight: e.target.value.replace(/[^\d.,]/g, '') }))}
            />
            <span>kg</span>
          </div>
        </label>
        <div className="field">
          <span className="field__label">Medidas (opcional)</span>
          <div className="measure-grid">
            {BODY_FIELDS.filter((f) => f.key !== 'weight').map((f) => (
              <label key={f.key} className="unit-input">
                <span className="unit-input__label">{f.label}</span>
                <input
                  inputMode="decimal"
                  placeholder="—"
                  value={vals[f.key] ?? ''}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value.replace(/[^\d.,]/g, '') }))}
                />
                <span>cm</span>
              </label>
            ))}
          </div>
        </div>
        {entry && (
          <button className="btn btn--danger-plain" onClick={remove}>
            Eliminar registro
          </button>
        )}
      </div>
    </Sheet>
  );
}
