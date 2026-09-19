// Placeholder world renderer (DOM). Shows explicit placeholder boxes at scene positions.
// Replace with a Phaser isometric renderer implementing WorldViewProps (see world/index.ts).
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import type { WorldViewProps } from './types';

export function DomWorldView({ scene, onSelectActor, onSelectHotspot }: WorldViewProps) {
  return (
    <div className="world" data-stage={scene.stage} data-mode={scene.mode}>
      <div className="world__bg"><PlaceholderAsset assetKey={scene.backgroundKey} variant="fill" /></div>

      {scene.hotspots.map((h) => (
        <button
          key={h.id}
          className={`world__hotspot ${h.state ? `world__hotspot--${h.state.toLowerCase()}` : ''}`}
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          onClick={() => onSelectHotspot?.(h)}
          data-asset={h.assetKey}
        >
          <span>{h.label}</span>
          {h.state && <span className="xs">{h.state}</span>}
          {h.badge && <span className="marker">{h.badge}</span>}
        </button>
      ))}

      {scene.actors.map((a) => (
        <button
          key={a.id}
          className="world__actor"
          style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
          onClick={() => onSelectActor?.(a)}
          aria-label={a.label}
        >
          <PlaceholderAsset assetKey={a.assetKey} />
          <span className="world__actor-name">{a.label}</span>
          {a.badge && <span className="marker">{a.badge}</span>}
        </button>
      ))}
    </div>
  );
}
