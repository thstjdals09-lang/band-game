// Neutral world renderer (DOM) used until the Phaser isometric renderer exists.
// Shows actors as figure silhouettes and objects as labelled frames - no asset key strings.
import { PlaceholderAsset } from '@/components/PlaceholderAsset';
import type { WorldViewProps } from './types';

export function DomWorldView({ scene, onSelectActor, onSelectHotspot }: WorldViewProps) {
  return (
    <div className="world" data-stage={scene.stage} data-mode={scene.mode}>
      <div className="world__bg"><PlaceholderAsset assetKey={scene.backgroundKey} variant="fill" kind="scene" /></div>

      {scene.hotspots.map((h) => (
        <button
          key={h.id}
          className={`world__hotspot ${h.state ? `world__hotspot--${h.state.toLowerCase()}` : ''}`}
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          onClick={() => onSelectHotspot?.(h)}
          data-asset={h.assetKey}
          data-hotspot={h.id}
        >
          <span>{h.label}</span>
          {h.stateLabel && <span className="world__hotspot-state">{h.stateLabel}</span>}
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
          data-actor={a.id}
        >
          <PlaceholderAsset assetKey={a.assetKey} kind="character" />
          <span className="world__actor-name">{a.label}</span>
          {a.badge && <span className="marker">{a.badge}</span>}
        </button>
      ))}
    </div>
  );
}
