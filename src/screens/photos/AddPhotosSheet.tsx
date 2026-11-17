import { useEffect, useState } from 'react';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import { Segmented } from '../../ui/controls';
import type { Photo, PhotoAngle } from '../../db/types';
import { compressPhoto, fmtBytes } from '../../lib/image';
import { uid } from '../../lib/id';
import { isoDate } from '../../lib/format';
import { db } from '../../db/db';
import { toast } from '../../ui/uiStore';
import { useObjectURL } from '../../ui/useObjectURL';

const ANGLES: PhotoAngle[] = ['frente', 'perfil', 'espalda'];

interface Draft {
  key: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
  angle: PhotoAngle;
  original: number;
}

function DraftRow({ d, onAngle }: { d: Draft; onAngle: (a: PhotoAngle) => void }) {
  const url = useObjectURL(d.thumb);
  return (
    <div className="draft">
      {url && <img src={url} alt="" />}
      <div className="draft__side">
        <Segmented
          value={d.angle}
          onChange={onAngle}
          options={[
            { value: 'frente', label: 'Frente' },
            { value: 'perfil', label: 'Perfil' },
            { value: 'espalda', label: 'Espalda' },
          ]}
        />
        <span className="hint" style={{ marginTop: 0 }}>
          {fmtBytes(d.original)} → {fmtBytes(d.blob.size)}
        </span>
      </div>
    </div>
  );
}

export function AddPhotosSheet({ files, onClose }: { files: File[] | null; onClose: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(isoDate());

  useEffect(() => {
    if (!files?.length) return;
    let cancelled = false;
    setDrafts([]);
    setDate(isoDate());
    setBusy(true);
    (async () => {
      const out: Draft[] = [];
      for (const [i, f] of files.entries()) {
        try {
          const c = await compressPhoto(f);
          out.push({ key: uid(), ...c, angle: ANGLES[i % 3], original: f.size });
        } catch {
          toast(`No se pudo leer ${f.name}`);
        }
      }
      if (!cancelled) {
        setDrafts(out);
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const save = async () => {
    const now = Date.now();
    const rows: Photo[] = drafts.map((d, i) => ({
      id: uid(),
      date,
      angle: d.angle,
      blob: d.blob,
      thumb: d.thumb,
      width: d.width,
      height: d.height,
      createdAt: now + i,
    }));
    await db.photos.bulkPut(rows);
    toast(rows.length === 1 ? 'Foto guardada' : `${rows.length} fotos guardadas`, { tone: 'success' });
    onClose();
  };

  return (
    <Sheet open={!!files?.length} onClose={onClose} size="full">
      <SheetHeader
        title={drafts.length > 1 ? `${drafts.length} fotos` : 'Nueva foto'}
        left={
          <button className="link-btn" onClick={onClose}>
            Cancelar
          </button>
        }
        right={
          <button className="link-btn is-bold" disabled={busy || drafts.length === 0} onClick={save}>
            Guardar
          </button>
        }
      />
      <div className="sheet-scroll form">
        <label className="field">
          <span className="field__label">Fecha</span>
          <input className="input" type="date" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        {busy && <p className="muted" style={{ textAlign: 'center' }}>Comprimiendo…</p>}
        <div className="drafts">
          {drafts.map((d) => (
            <DraftRow key={d.key} d={d} onAngle={(a) => setDrafts((l) => l.map((x) => (x.key === d.key ? { ...x, angle: a } : x)))} />
          ))}
        </div>
        <p className="hint">
          Consejo: misma luz, misma distancia y misma postura en cada foto para que la comparación sea fiable.
        </p>
      </div>
    </Sheet>
  );
}
