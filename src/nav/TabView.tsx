import type { ReactNode } from 'react';
import { useNav, type Tab } from './nav';

export function TabView({ tab, root }: { tab: Tab; root: ReactNode }) {
  const active = useNav((s) => s.tab === tab);
  const stack = useNav((s) => s.stacks[tab]);
  const live = stack.filter((e) => !e.leaving);
  const topKey = live.length ? live[live.length - 1].key : null;
  return (
    <section className={`tabview ${active ? 'is-active' : ''}`} aria-hidden={!active}>
      <div className={`stack-screen is-root ${live.length > 0 ? 'is-covered' : ''}`}>{root}</div>
      {stack.map((e) => {
        const covered = !e.leaving && topKey !== null && e.key !== topKey;
        return (
          <div key={e.key} className={`stack-screen is-pushed ${e.leaving ? 'is-leaving' : ''} ${covered ? 'is-covered' : ''}`}>
            {e.render()}
          </div>
        );
      })}
    </section>
  );
}
