import { useEffect, useRef, useState } from 'react';
import { BellRing, Download, HardDrive, Info, Smartphone, Sun, Timer, Upload, Weight } from 'lucide-react';
import { Page } from '../../ui/Page';
import { setSetting, useSettings } from '../../state/settings';
import { fmtKg, fmtRest, relativeDay } from '../../lib/format';
import { ask, confirm, showActions, toast } from '../../ui/uiStore';
import { REST_OPTIONS } from '../../ui/restOptions';
import { Toggle } from '../../ui/controls';
import { createBackup, readBackup, restoreBackup, shareOrDownload } from '../../lib/backup';
import { fmtBytes } from '../../lib/image';
import { isStandalone } from '../../lib/platform';
import { InstallSheet } from './InstallSheet';
import { useWorkout } from '../../state/workout';

const INCREMENTS = [1, 1.25, 2, 2.5, 5];

function useStorageInfo() {
  const [info, setInfo] = useState<{ usage?: number; persisted?: boolean }>({});
  useEffect(() => {
    const load = async () => {
      try {
        const [est, persisted] = await Promise.all([navigator.storage?.estimate?.(), navigator.storage?.persisted?.()]);
        setInfo({ usage: est?.usage, persisted });
      } catch {
        /* sin datos */
      }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  return info;
}

export function SettingsHome() {
  const s = useSettings();
  const storage = useStorageInfo();
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const standalone = isStandalone();
  const backupAge = s.lastBackupAt ? (Date.now() - s.lastBackupAt) / 86400000 : Infinity;

  const doExport = async () => {
    setBusy('export');
    try {
      const file = await createBackup();
      let r = await shareOrDownload(file);
      if (r === 'needs-gesture') {
        const ok = await confirm({ title: 'Copia preparada', message: `${fmtBytes(file.size)} listos para guardar en Archivos o iCloud Drive.`, confirmText: 'Guardar' });
        r = ok ? await shareOrDownload(file) : 'cancelled';
      }
      if (r === 'shared' || r === 'downloaded') {
        await setSetting('lastBackupAt', Date.now());
        toast(`Copia creada (${fmtBytes(file.size)})`, { tone: 'success' });
      }
    } catch (e) {
      toast('No se pudo crear la copia: ' + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (file: File) => {
    setBusy('import');
    try {
      const backup = await readBackup(file);
      const j = backup.json;
      const r = await ask({
        title: '¿Restaurar esta copia?',
        message: `Del ${new Date(j.exportedAt).toLocaleDateString('es-ES')}: ${j.workouts.length} entrenos, ${j.routines.length} rutinas y ${j.photos.length} fotos. Sustituirá TODOS los datos actuales.`,
        confirmText: 'Restaurar',
        destructive: true,
      });
      if (r !== 'confirm') return;
      if (useWorkout.getState().workout) await useWorkout.getState().discard();
      await restoreBackup(backup);
      await useWorkout.getState().load();
      toast('Copia restaurada', { tone: 'success' });
    } catch (e) {
      toast((e as Error).message || 'No se pudo leer el archivo');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Page title="Ajustes" large>
      {!standalone && (
        <button className="install-banner" onClick={() => setInstallOpen(true)}>
          <Smartphone size={22} />
          <span>
            <b>Instala la app en tu iPhone</b>
            <small>Pantalla completa, sin conexión y sin que iOS borre tus datos.</small>
          </span>
        </button>
      )}

      <div className="group-title">Entreno</div>
      <div className="group">
        <button
          className="group__row group__row--link"
          onClick={() =>
            showActions({
              title: 'Descanso por defecto',
              actions: REST_OPTIONS.map((sec) => ({
                label: fmtRest(sec),
                selected: s.defaultRestSec === sec,
                onSelect: () => void setSetting('defaultRestSec', sec),
              })),
            })
          }
        >
          <span className="group__icon group__icon--orange">
            <Timer size={18} />
          </span>
          <span>Descanso por defecto</span>
          <span className="group__value">{fmtRest(s.defaultRestSec)}</span>
        </button>
        <button
          className="group__row group__row--link"
          onClick={() =>
            showActions({
              title: 'Incremento de peso',
              message: 'Lo que suman los botones + y − del teclado. Cada ejercicio puede tener el suyo.',
              actions: INCREMENTS.map((inc) => ({
                label: `${fmtKg(inc)} kg`,
                selected: s.weightIncrement === inc,
                onSelect: () => void setSetting('weightIncrement', inc),
              })),
            })
          }
        >
          <span className="group__icon group__icon--blue">
            <Weight size={18} />
          </span>
          <span>Incremento de peso</span>
          <span className="group__value">{fmtKg(s.weightIncrement)} kg</span>
        </button>
        <div className="group__row">
          <span className="group__icon group__icon--red">
            <BellRing size={18} />
          </span>
          <span>Sonido al terminar el descanso</span>
          <Toggle value={s.restSound} onChange={(v) => void setSetting('restSound', v)} />
        </div>
        <div className="group__row">
          <span className="group__icon group__icon--yellow">
            <Sun size={18} />
          </span>
          <span>Pantalla encendida durante el entreno</span>
          <Toggle value={s.keepAwake} onChange={(v) => void setSetting('keepAwake', v)} />
        </div>
      </div>
      <p className="hint group-hint">El sonido solo suena con la app abierta: iOS no permite avisos de una web con la pantalla bloqueada.</p>

      <div className="group-title">Copia de seguridad</div>
      {backupAge > 14 && (
        <div className="backup-warn">
          {s.lastBackupAt ? `Tu última copia es de hace ${Math.floor(backupAge)} días.` : 'Aún no has hecho ninguna copia.'} Guárdala en Archivos o iCloud Drive por si
          pierdes o cambias de iPhone.
        </div>
      )}
      <div className="group">
        <button className="group__row group__row--link" onClick={doExport} disabled={!!busy}>
          <span className="group__icon group__icon--green">
            <Upload size={18} />
          </span>
          <span>{busy === 'export' ? 'Creando copia…' : 'Exportar copia completa'}</span>
          <span className="group__value">{s.lastBackupAt ? relativeDay(s.lastBackupAt) : 'Nunca'}</span>
        </button>
        <button className="group__row group__row--link" onClick={() => fileInput.current?.click()} disabled={!!busy}>
          <span className="group__icon group__icon--blue">
            <Download size={18} />
          </span>
          <span>{busy === 'import' ? 'Restaurando…' : 'Importar copia'}</span>
        </button>
      </div>
      <p className="hint group-hint">Un único archivo .zip con entrenos, rutinas, ejercicios, medidas, ajustes y fotos.</p>
      <input
        ref={fileInput}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void doImport(f);
        }}
      />

      <div className="group-title">Dispositivo</div>
      <div className="group">
        <div className="group__row">
          <span className="group__icon group__icon--purple">
            <HardDrive size={18} />
          </span>
          <span>Espacio usado</span>
          <span className="group__value">{storage.usage != null ? fmtBytes(storage.usage) : '—'}</span>
        </div>
        <div className="group__row">
          <span className="group__icon group__icon--green">
            <Info size={18} />
          </span>
          <span>Almacenamiento persistente</span>
          <span className="group__value">{storage.persisted ? 'Activado' : 'No concedido'}</span>
        </div>
        <button className="group__row group__row--link" onClick={() => setInstallOpen(true)}>
          <span className="group__icon">
            <Smartphone size={18} />
          </span>
          <span>Instalar en el iPhone</span>
          <span className="group__value">{standalone ? 'Instalada' : 'Ver pasos'}</span>
        </button>
      </div>
      <p className="hint group-hint">
        Tus datos se guardan solo en este dispositivo; no hay servidor ni cuenta. {!storage.persisted && 'iOS concede el almacenamiento persistente al instalar la app en la pantalla de inicio.'}
      </p>
      <p className="version">Progreso · versión {__APP_VERSION__}</p>
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </Page>
  );
}
