import { strFromU8, strToU8, unzip, zip, type Unzipped } from 'fflate';
import { db } from '../db/db';
import type { BodyMetric, Exercise, Photo, Routine, SettingRow, Workout } from '../db/types';
import { isoDate } from './format';

const FORMAT = 'progreso-backup';
const VERSION = 1;

interface PhotoMeta extends Omit<Photo, 'blob' | 'thumb'> {
  file: string;
  thumbFile: string;
}

interface BackupJSON {
  format: typeof FORMAT;
  version: number;
  exportedAt: number;
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  bodyMetrics: BodyMetric[];
  settings: SettingRow[];
  photos: PhotoMeta[];
}

const zipAsync = (files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]>) =>
  new Promise<Uint8Array>((res, rej) => zip(files, { level: 6 }, (e, d) => (e ? rej(e) : res(d))));
const unzipAsync = (data: Uint8Array) => new Promise<Unzipped>((res, rej) => unzip(data, (e, d) => (e ? rej(e) : res(d))));

export async function createBackup(): Promise<File> {
  const [exercises, routines, workouts, bodyMetrics, settings, photos] = await Promise.all([
    db.exercises.toArray(),
    db.routines.toArray(),
    db.workouts.toArray(),
    db.bodyMetrics.toArray(),
    db.settings.toArray(),
    db.photos.toArray(),
  ]);
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const metas: PhotoMeta[] = [];
  for (const p of photos) {
    const { blob, thumb, ...meta } = p;
    const file = `fotos/${p.id}.jpg`;
    const thumbFile = `fotos/${p.id}_mini.jpg`;
    // Las JPEG ya están comprimidas: se guardan sin volver a comprimir.
    files[file] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
    files[thumbFile] = [new Uint8Array(await thumb.arrayBuffer()), { level: 0 }];
    metas.push({ ...meta, file, thumbFile });
  }
  const json: BackupJSON = {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    exercises,
    routines,
    workouts,
    bodyMetrics,
    settings: settings.filter((s) => s.key !== 'lastBackupAt'),
    photos: metas,
  };
  files['datos.json'] = strToU8(JSON.stringify(json));
  const data = await zipAsync(files);
  return new File([data as BlobPart], `progreso-copia-${isoDate()}.zip`, { type: 'application/zip' });
}

export interface BackupSummary {
  json: BackupJSON;
  raw: Unzipped;
}

export async function readBackup(file: File): Promise<BackupSummary> {
  const raw = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  const entry = raw['datos.json'];
  if (!entry) throw new Error('El archivo no es una copia de seguridad de esta app.');
  const json = JSON.parse(strFromU8(entry)) as BackupJSON;
  if (json.format !== FORMAT) throw new Error('El archivo no es una copia de seguridad de esta app.');
  if (json.version > VERSION) throw new Error('La copia es de una versión más nueva de la app. Actualízala primero.');
  return { json, raw };
}

/** Sustituye todos los datos actuales por los de la copia. */
export async function restoreBackup({ json, raw }: BackupSummary) {
  const photos: Photo[] = json.photos.map(({ file, thumbFile, ...meta }) => ({
    ...meta,
    blob: new Blob([(raw[file] ?? new Uint8Array()) as BlobPart], { type: 'image/jpeg' }),
    thumb: new Blob([(raw[thumbFile] ?? raw[file] ?? new Uint8Array()) as BlobPart], { type: 'image/jpeg' }),
  }));
  await db.transaction('rw', [db.exercises, db.routines, db.workouts, db.bodyMetrics, db.settings, db.photos], async () => {
    await Promise.all([db.exercises.clear(), db.routines.clear(), db.workouts.clear(), db.bodyMetrics.clear(), db.settings.clear(), db.photos.clear()]);
    await db.exercises.bulkPut(json.exercises);
    await db.routines.bulkPut(json.routines);
    await db.workouts.bulkPut(json.workouts);
    await db.bodyMetrics.bulkPut(json.bodyMetrics);
    await db.settings.bulkPut(json.settings);
    await db.photos.bulkPut(photos);
  });
}

/** Comparte el archivo (en iPhone: "Guardar en Archivos") o lo descarga si no se puede. */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled' | 'needs-gesture'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // Safari exige que compartir responda a un toque reciente; si el zip tardó, pedimos otro toque.
      if ((e as Error).name === 'NotAllowedError') return 'needs-gesture';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
