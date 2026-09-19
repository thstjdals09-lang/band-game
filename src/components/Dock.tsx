// Bottom Dock - exactly 5 items (IA §3, Visual Bible §08 Dock Rule). No HOME item.
// On HOME no item is active. Hidden on immersive flows.
// Icons are neutral line glyphs until the icon asset set exists (assetRegistry ICON_DOCK_*).
import { resolveAsset } from '@/assets/registry';
import { DOCK_ITEMS, type DockId } from '@/app/routes';
import { useGameNav } from '@/app/navigation';

const GLYPHS: Record<DockId, JSX.Element> = {
  band: <><circle cx="9" cy="16" r="3" /><circle cx="18" cy="14" r="2.4" /><path d="M12 16V5l8 2v7" /></>,
  schedule: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  audition: <><rect x="9.5" y="3" width="5" height="10" rx="2.5" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" /></>,
  management: <><path d="M4 20V11M10 20V6M16 20v-6M22 20h-20" /></>,
  outside: <><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="M9 4v13M15 7v13" /></>,
};

export function Dock({ active }: { active?: DockId }) {
  const { openDock } = useGameNav();
  return (
    <nav className="dock" aria-label="메뉴">
      {DOCK_ITEMS.map((item) => {
        const url = resolveAsset(item.iconKey);
        return (
          <button
            key={item.id}
            className={`dock__item ${active === item.id ? 'dock__item--active' : ''}`}
            onClick={() => openDock(item.path)}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <span className="dock__icon">
              {url ? <img src={url} alt="" /> : <svg viewBox="0 0 24 24" aria-hidden>{GLYPHS[item.id]}</svg>}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
