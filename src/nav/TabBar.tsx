import { Camera, ChartLine, Clock3, Dumbbell, Settings } from 'lucide-react';
import { useNav, type Tab } from './nav';

const TABS: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'train', label: 'Entrenar', icon: Dumbbell },
  { id: 'history', label: 'Historial', icon: Clock3 },
  { id: 'progress', label: 'Progreso', icon: ChartLine },
  { id: 'photos', label: 'Fotos', icon: Camera },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export function TabBar() {
  const tab = useNav((s) => s.tab);
  const setTab = useNav((s) => s.setTab);
  return (
    <nav className="tabbar">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={`tabbar__item ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
          <Icon size={25} strokeWidth={tab === id ? 2.3 : 1.9} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
