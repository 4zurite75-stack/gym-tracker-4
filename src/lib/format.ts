const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: true });
const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export const fmtNum = (n: number) => nf.format(n);
export const fmtInt = (n: number) => nf0.format(Math.round(n));
export const fmt1 = (n: number) => nf1.format(n);

export function fmtKg(n: number | null | undefined): string {
  if (n == null) return '';
  return nf.format(n);
}

/** Volumen con separador de miles siempre (12.450 kg). */
export function fmtVolume(kg: number): string {
  const s = Math.round(kg).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export function fmtDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export function fmtRest(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}

const dfLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const dfShort = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const dfShortYear = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const dfTime = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtDateLong = (t: number | Date) => cap(dfLong.format(t));
export function fmtDateShort(t: number | Date): string {
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (sameYear ? dfShort : dfShortYear).format(d).replace('.', '');
}
export const fmtTime = (t: number | Date) => dfTime.format(t);

export function relativeDay(t: number): string {
  const d = new Date(t);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return fmtDateShort(t);
}

export function isoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function workoutDefaultName(t = Date.now()): string {
  const h = new Date(t).getHours();
  if (h < 12) return 'Entreno de mañana';
  if (h < 20) return 'Entreno de tarde';
  return 'Entreno de noche';
}

/** "80 × 8 @2" */
export function fmtSet(weight: number | null, reps: number | null, rir: number | null): string {
  if (reps == null) return '—';
  const w = weight != null ? `${fmtKg(weight)} × ` : '';
  const r = rir != null ? ` @${fmtKg(rir)}` : '';
  return `${w}${reps}${r}`;
}
