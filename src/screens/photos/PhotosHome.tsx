import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Columns2, Plus } from 'lucide-react';
import { db } from '../../db/db';
import type { Photo, PhotoAngle } from '../../db/types';
import { Page } from '../../ui/Page';
import { Chip, Empty } from '../../ui/controls';
import { ANGLE_LABEL } from '../../db/labels';
import { fmtDateLong } from '../../lib/format';
import { useObjectURL } from '../../ui/useObjectURL';
import { AddPhotosSheet } from './AddPhotosSheet';
import { PhotoViewer } from './PhotoViewer';
import { push } from '../../nav/nav';
import { ComparePage } from './ComparePage';

function Thumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const url = useObjectURL(photo.thumb);
  return (
    <button className="thumb" onClick={onClick}>
      {url && <img src={url} alt="" loading="lazy" />}
      <span className="thumb__tag">{ANGLE_LABEL[photo.angle]}</span>
    </button>
  );
}

export function PhotosHome() {
  const photos = useLiveQuery(() => db.photos.toArray(), []);
  const [angle, setAngle] = useState<PhotoAngle | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(
    () =>
      (photos ?? [])
        .filter((p) => !angle || p.angle === angle)
        .sort((a, b) => b.date.localeCompare(a.date) || a.createdAt - b.createdAt),
    [photos, angle],
  );
  const groups = useMemo(() => {
    const m = new Map<string, { photo: Photo; idx: number }[]>();
    list.forEach((photo, idx) => {
      if (!m.has(photo.date)) m.set(photo.date, []);
      m.get(photo.date)!.push({ photo, idx });
    });
    return [...m.entries()];
  }, [list]);

  const dates = new Set((photos ?? []).map((p) => p.date));
  const pick = () => input.current?.click();

  return (
    <Page
      title="Fotos"
      large
      right={
          <button className="icon-btn" onClick={pick} aria-label="Añadir fotos">
            <Plus size={24} />
          </button>
      }
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const fs = [...(e.target.files ?? [])];
          e.target.value = '';
          if (fs.length) setFiles(fs);
        }}
      />

      {photos && photos.length === 0 ? (
        <Empty
          icon={<Camera size={30} />}
          title="Tus fotos de progreso"
          text="Hazte fotos de frente, perfil y espalda cada 2–4 semanas y compáralas con el tiempo. Se guardan solo en este iPhone."
          action={
            <button className="btn btn--primary" onClick={pick}>
              <Camera size={18} /> Hacer o elegir fotos
            </button>
          }
        />
      ) : (
        <>
          <div className="section photo-actions">
            {dates.size >= 2 && (
              <button className="btn btn--tinted" onClick={() => push(() => <ComparePage />)}>
                <Columns2 size={18} /> Comparar antes / después
              </button>
            )}
            <div className="chips-scroll">
              <Chip active={angle === null} onClick={() => setAngle(null)}>
                Todas
              </Chip>
              {(['frente', 'perfil', 'espalda'] as PhotoAngle[]).map((a) => (
                <Chip key={a} active={angle === a} onClick={() => setAngle(angle === a ? null : a)}>
                  {ANGLE_LABEL[a]}
                </Chip>
              ))}
            </div>
          </div>
          {groups.map(([date, items]) => (
            <div key={date} className="photo-group">
              <div className="photo-group__head">{fmtDateLong(new Date(date + 'T12:00:00'))}</div>
              <div className="thumb-grid">
                {items.map(({ photo, idx }) => (
                  <Thumb key={photo.id} photo={photo} onClick={() => setViewing(idx)} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <AddPhotosSheet files={files} onClose={() => setFiles(null)} />
      <PhotoViewer photos={list} index={viewing} onClose={() => setViewing(null)} />
    </Page>
  );
}
