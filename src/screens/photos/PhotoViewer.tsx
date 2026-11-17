import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import type { Photo } from '../../db/types';
import { useObjectURL } from '../../ui/useObjectURL';
import { ANGLE_LABEL } from '../../db/labels';
import { fmtDateLong } from '../../lib/format';
import { confirm } from '../../ui/uiStore';
import { db } from '../../db/db';

function Img({ photo }: { photo: Photo }) {
  const thumb = useObjectURL(photo.thumb);
  const full = useObjectURL(photo.blob);
  return <img className="viewer__img" src={full ?? thumb} alt="" draggable={false} />;
}

export function PhotoViewer({ photos, index, onClose }: { photos: Photo[]; index: number | null; onClose: () => void }) {
  const [i, setI] = useState(index ?? 0);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (index != null) setI(index);
  }, [index]);
  if (index == null || !photos.length) return null;
  const p = photos[Math.min(i, photos.length - 1)];
  const go = (d: number) => setI((x) => Math.max(0, Math.min(photos.length - 1, x + d)));

  const remove = async () => {
    if (!(await confirm({ title: '¿Eliminar esta foto?', confirmText: 'Eliminar', destructive: true }))) return;
    await db.photos.delete(p.id);
    if (photos.length <= 1) onClose();
    else setI((x) => Math.min(x, photos.length - 2));
  };

  return createPortal(
    <div className="viewer">
      <header className="viewer__top">
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <X size={26} color="#fff" />
        </button>
        <div className="viewer__title">
          <span>{fmtDateLong(new Date(p.date + 'T12:00:00'))}</span>
          <small>
            {ANGLE_LABEL[p.angle]} · {i + 1} de {photos.length}
          </small>
        </div>
        <button className="icon-btn" onClick={remove} aria-label="Eliminar">
          <Trash2 size={22} color="#ff453a" />
        </button>
      </header>
      <div
        className="viewer__stage"
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerMove={(e) => start.current && setDx(e.clientX - start.current.x)}
        onPointerUp={() => {
          if (dx < -60) go(1);
          else if (dx > 60) go(-1);
          start.current = null;
          setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDx(0);
        }}
      >
        <div className="viewer__slide" style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : undefined }}>
          <Img photo={p} />
        </div>
        {i > 0 && (
          <button className="viewer__nav viewer__nav--l" onClick={() => go(-1)} aria-label="Anterior">
            <ChevronLeft size={28} />
          </button>
        )}
        {i < photos.length - 1 && (
          <button className="viewer__nav viewer__nav--r" onClick={() => go(1)} aria-label="Siguiente">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
