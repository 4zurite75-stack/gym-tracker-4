import { useEffect, useRef } from 'react';
import { BellRing } from 'lucide-react';
import { useWorkout } from '../../state/workout';
import { useNow } from './useNow';
import { beep } from '../../lib/sound';
import { useSettings } from '../../state/settings';
import { toast } from '../../ui/uiStore';

/** Avisa cuando termina el descanso (con la app abierta) y limpia el temporizador. */
export function RestWatcher() {
  const rest = useWorkout((s) => s.workout?.rest);
  const settings = useSettings();
  const now = useNow(!!rest, 250);
  const fired = useRef<number | null>(null);

  useEffect(() => {
    if (!rest || now < rest.endsAt || fired.current === rest.endsAt) return;
    fired.current = rest.endsAt;
    const late = now - rest.endsAt > 5000;
    if (!late && settings.restSound) beep();
    if (!late) {
      document.documentElement.classList.add('rest-flash');
      setTimeout(() => document.documentElement.classList.remove('rest-flash'), 900);
    }
    toast('¡Descanso terminado!', { tone: 'accent', icon: <BellRing size={18} /> });
    useWorkout.getState().mutate((w) => {
      if (w.rest?.endsAt === rest.endsAt) w.rest = null;
    });
  }, [now, rest, settings.restSound]);

  return null;
}
