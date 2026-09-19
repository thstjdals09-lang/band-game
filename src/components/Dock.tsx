// Bottom Dock - exactly 5 items (IA §3, Visual Bible §08 Dock Rule). No HOME item.
// On HOME no item is active. Hidden on immersive flows.
import { resolveAsset } from '@/assets/registry';
import { DOCK_ITEMS, type DockId } from '@/app/routes';
import { useGameNav } from '@/app/navigation';

export function Dock({ active }: { active?: DockId }) {
  const { openDock } = useGameNav();
  return (
    <nav className="dock" aria-label="dock">
      {DOCK_ITEMS.map((item) => {
        const url = resolveAsset(item.iconKey);
        return (
          <button
            key={item.id}
            className={`dock__item ${active === item.id ? 'dock__item--active' : ''}`}
            onClick={() => openDock(item.path)}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <span className="dock__icon">{url ? <img src={url} alt="" /> : item.label[0]}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
