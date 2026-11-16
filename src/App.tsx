import { useEffect } from 'react';
import { TabBar } from './nav/TabBar';
import { TabView } from './nav/TabView';
import { Overlays } from './ui/Overlays';
import { TrainHome } from './screens/train/TrainHome';
import { HistoryHome } from './screens/history/HistoryHome';
import { ProgressHome } from './screens/progress/ProgressHome';
import { PhotosHome } from './screens/photos/PhotosHome';
import { SettingsHome } from './screens/settings/SettingsHome';
import { WorkoutScreen } from './screens/workout/WorkoutScreen';
import { MiniBar } from './screens/workout/MiniBar';
import { RestWatcher } from './screens/workout/RestWatcher';
import { useWorkout } from './state/workout';
import { useSettings } from './state/settings';
import { setKeepAwake } from './lib/wakeLock';

export function App() {
  const hasWorkout = useWorkout((s) => !!s.workout);
  const settings = useSettings();

  useEffect(() => {
    void useWorkout
      .getState()
      .load()
      .finally(() => {
        // Retira la pantalla de carga cuando los datos ya están listos.
        const el = document.getElementById('launch');
        if (!el) return;
        requestAnimationFrame(() => el.classList.add('is-hidden'));
        setTimeout(() => el.remove(), 450);
      });
  }, []);

  useEffect(() => {
    setKeepAwake(hasWorkout && settings.keepAwake);
  }, [hasWorkout, settings.keepAwake]);

  return (
    <div className={`app ${hasWorkout ? 'has-minibar' : ''}`}>
      <main className="tabviews">
        <TabView tab="train" root={<TrainHome />} />
        <TabView tab="history" root={<HistoryHome />} />
        <TabView tab="progress" root={<ProgressHome />} />
        <TabView tab="photos" root={<PhotosHome />} />
        <TabView tab="settings" root={<SettingsHome />} />
      </main>
      <MiniBar />
      <TabBar />
      <WorkoutScreen />
      <RestWatcher />
      <Overlays />
    </div>
  );
}
