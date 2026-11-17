import type { BodyMetric } from '../../db/types';

export type BodyKey = 'weight' | 'waist' | 'chest' | 'arm' | 'thigh' | 'hips' | 'neck';

export const BODY_FIELDS: { key: BodyKey; label: string; unit: 'kg' | 'cm' }[] = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'arm', label: 'Brazo', unit: 'cm' },
  { key: 'thigh', label: 'Muslo', unit: 'cm' },
  { key: 'hips', label: 'Cadera', unit: 'cm' },
  { key: 'neck', label: 'Cuello', unit: 'cm' },
];

export const dateToTs = (d: string) => new Date(d + 'T12:00:00').getTime();

/** Media móvil de los registros de los últimos 7 días. */
export function movingAverage(entries: { x: number; y: number }[], days = 7) {
  return entries.map((p, i) => {
    const from = p.x - (days - 1) * 86400000 - 1;
    const win = entries.slice(0, i + 1).filter((q) => q.x >= from);
    return { x: p.x, y: Math.round((win.reduce((a, q) => a + q.y, 0) / win.length) * 10) / 10 };
  });
}

export function seriesFor(list: BodyMetric[], key: BodyKey) {
  return list
    .filter((m) => m[key] != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ x: dateToTs(m.date), y: m[key] as number }));
}
