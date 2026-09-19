// DEBUG isometric renderer (SVG). Purpose: verify grid, footprints, depth order, hit areas and
// responsive camera - NOT to be the final look. It draws neutral blocks, never improvised art.
// The final renderer (Phaser) will consume the same WorldScene and draw order.

import { useMemo } from 'react';
import { placeholderLabel, resolveAsset } from '@/assets/registry';
import { useDevDiagnostics } from '@/state/devStore';
import { gridToScreen, pointsToSvg, tileDiamond, footprintDiamond, type ScreenPoint } from '../iso/projection';
import { footprintTiles, frontTile } from '../iso/coordinates';
import { tapRadiusFor } from '../iso/hitTest';
import { NO_DEBUG, type RenderNode, type WorldViewProps } from './types';

const MATERIAL_FILL: Record<string, string> = {
  CONCRETE: '#232833',
  RUG: '#3a2a2c',
  BOOTH: '#1f2b33',
};

const OBJECT_FILL: Record<string, string> = {
  interactive: '#2f3a4d',
  facility: '#3a3326',
  prop: '#272d3a',
  zone: 'rgba(232,171,92,0.07)',
};

export function DebugIsoWorldView({ scene, debug = NO_DEBUG, onSelectObject, onSelectCharacter, onPickTile }: WorldViewProps) {
  const { camera, projection, nodes } = scene;
  const dev = useDevDiagnostics();
  const transform = `translate(${camera.offsetX} ${camera.offsetY}) scale(${camera.zoom})`;

  const floorHitTiles = useMemo(
    () => (onPickTile ? scene.map.floorTiles.map((t) => t.pos) : []),
    [onPickTile, scene.map],
  );

  return (
    <svg
      className="isoworld"
      data-stage={scene.stage}
      data-mode={scene.mode}
      width="100%"
      height="100%"
      role="img"
      aria-label="베이스캠프"
    >
      {/* World space: everything inside is affected by camera zoom/pan. */}
      <g transform={transform}>
        {onPickTile && floorHitTiles.map((t) => (
          <polygon
            key={`pick:${t.x},${t.y}`}
            points={pointsToSvg(tileDiamond(t, projection))}
            fill="transparent"
            onClick={() => onPickTile(t)}
          />
        ))}

        {nodes.map((n) => (
          <WorldNode
            key={n.id}
            node={n}
            scene={scene}
            debug={debug}
            dev={dev}
            onSelect={n.kind === 'character' ? onSelectCharacter : onSelectObject}
          />
        ))}

        {debug.spawnPoints && scene.spawnPoints.map((s) => {
          const c = gridToScreen(s.pos, projection);
          return (
            <g key={`spawn:${s.id}`} className="isoworld__spawn">
              <circle cx={c.x} cy={c.y} r={projection.tileWidth * 0.12} />
              <text x={c.x} y={c.y - projection.tileHeight * 0.35} textAnchor="middle">{s.id}</text>
            </g>
          );
        })}

        {debug.coordinates && scene.map.floorTiles.map((t) => {
          const c = gridToScreen(t.pos, projection);
          return (
            <text key={`co:${t.pos.x},${t.pos.y}`} className="isoworld__coord" x={c.x} y={c.y + 4} textAnchor="middle">
              {t.pos.x},{t.pos.y}
            </text>
          );
        })}
      </g>

      {/* Screen space: camera-independent debug chrome. */}
      {debug.safeArea && (
        <rect
          className="isoworld__safe"
          x={camera.safeRect.x + 1}
          y={camera.safeRect.y + 1}
          width={Math.max(0, camera.safeRect.width - 2)}
          height={Math.max(0, camera.safeRect.height - 2)}
        />
      )}
    </svg>
  );
}

interface NodeProps {
  node: RenderNode;
  scene: WorldViewProps['scene'];
  debug: NonNullable<WorldViewProps['debug']>;
  /** Developer diagnostics: reveals the asset key bound to this node. Never on for players. */
  dev?: boolean;
  onSelect?: (n: RenderNode) => void;
}

function WorldNode({ node, scene, debug, dev, onSelect }: NodeProps) {
  const { projection, camera } = scene;
  const interactive = !!node.target && !!onSelect;

  if (node.kind === 'floor') {
    return (
      <polygon
        className="isoworld__floor"
        points={pointsToSvg(tileDiamond(node.anchor, projection))}
        fill={MATERIAL_FILL[node.material ?? 'CONCRETE'] ?? MATERIAL_FILL.CONCRETE}
        stroke={debug.grid ? 'rgba(240,235,224,0.22)' : 'rgba(0,0,0,0.35)'}
        strokeWidth={debug.grid ? 1.5 : 1}
      />
    );
  }

  if (node.kind === 'zone') {
    return (
      <polygon
        className="isoworld__zone"
        points={pointsToSvg(footprintDiamond(node.anchor, node.footprint, projection))}
        fill={OBJECT_FILL.zone}
        stroke="rgba(232,171,92,0.3)"
        strokeDasharray="6 5"
      />
    );
  }

  if (node.kind === 'wall') {
    const top = tileDiamond(node.anchor, projection);
    const h = node.heightUnits * projection.elevationHeight;
    // Two visible faces of the wall block, drawn from the tile diamond.
    const faceA = [top[3], top[2], { x: top[2].x, y: top[2].y - h }, { x: top[3].x, y: top[3].y - h }];
    const faceB = [top[2], top[1], { x: top[1].x, y: top[1].y - h }, { x: top[2].x, y: top[2].y - h }];
    const cap = top.map((p) => ({ x: p.x, y: p.y - h }));
    return (
      <g className="isoworld__wall">
        <polygon points={pointsToSvg(faceA)} fill="#1b2029" />
        <polygon points={pointsToSvg(faceB)} fill="#151a22" />
        <polygon points={pointsToSvg(cap)} fill="#242a35" />
      </g>
    );
  }

  // object | character: neutral iso block + optional debug overlays
  const front = frontTile(node.anchor, node.footprint);
  const base = footprintDiamond(node.anchor, node.footprint, projection);
  const h = node.heightUnits * projection.elevationHeight;
  const top = base.map((p) => ({ x: p.x, y: p.y - h }));
  const left = [base[3], base[2], top[2], top[3]];
  const right = [base[2], base[1], top[1], top[2]];
  const centre = gridToScreen(front, projection);
  const tapR = tapRadiusFor(node.footprint.w * node.footprint.h, camera, projection) / camera.zoom;
  const hasArt = !!(node.assetKey && resolveAsset(node.assetKey));
  const fill = node.kind === 'character' ? '#2b3140' : (OBJECT_FILL[nodeKindFill(node)] ?? OBJECT_FILL.prop);

  return (
    <g
      className={`isoworld__node isoworld__node--${node.kind}${interactive ? ' isoworld__node--tap' : ''}`}
      data-object={node.kind === 'object' ? node.id.replace('object:', '') : undefined}
      data-character={node.kind === 'character' ? node.id.replace('character:', '') : undefined}
      data-state={node.state}
      onClick={interactive ? () => onSelect?.(node) : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `${node.label ?? node.id}${node.stateLabel ? ` · ${node.stateLabel}` : ''}` : undefined}
    >
      {debug.footprints && (
        <polygon className="isoworld__fp" points={pointsToSvg(base)} />
      )}
      {!hasArt && (
        <>
          <polygon points={pointsToSvg(base)} fill="rgba(0,0,0,0.35)" />
          <polygon points={pointsToSvg(left)} fill={shade(fill, -14)} />
          <polygon points={pointsToSvg(right)} fill={shade(fill, 8)} />
          <polygon points={pointsToSvg(top)} fill={shade(fill, 22)} stroke="rgba(240,235,224,0.14)" />
        </>
      )}
      {node.kind === 'character' && (
        <circle
          className="isoworld__head"
          cx={centre.x}
          cy={centre.y - h * 0.86}
          r={projection.tileWidth * 0.1}
        />
      )}
      {node.label && node.kind === 'object' && (
        <text className="isoworld__label" x={centre.x} y={centre.y - h - 8} textAnchor="middle">{node.label}</text>
      )}
      {node.kind === 'character' && (
        <text className="isoworld__label isoworld__label--char" x={centre.x} y={centre.y + 14} textAnchor="middle">{node.label}</text>
      )}
      {node.stateLabel && (
        <text className="isoworld__state" x={centre.x} y={centre.y - h + 6} textAnchor="middle">{node.stateLabel}</text>
      )}
      {node.badge && (
        <g className="isoworld__badge">
          <circle cx={centre.x + projection.tileWidth * 0.3} cy={centre.y - h - 14} r={13} />
          <text x={centre.x + projection.tileWidth * 0.3} y={centre.y - h - 9} textAnchor="middle">{node.badge}</text>
        </g>
      )}
      {dev && node.assetKey && (
        <text className="isoworld__devkey" x={centre.x} y={centre.y - h / 2} textAnchor="middle">
          {placeholderLabel(node.assetKey)}
        </text>
      )}
      {debug.depthAnchors && (
        <circle className="isoworld__depth" cx={centre.x} cy={centre.y} r={5} />
      )}
      {debug.interactionTiles && node.interactionTile && (
        <polygon className="isoworld__interaction" points={pointsToSvg(tileDiamond(node.interactionTile, projection))} />
      )}
      {debug.footprints && node.kind === 'object' && footprintTiles(node.anchor, node.footprint).map((t) => (
        <polygon key={`fpt:${t.x},${t.y}`} className="isoworld__fptile" points={pointsToSvg(tileDiamond(t, projection))} />
      ))}
      {interactive && (
        // Guarantees a finger-sized tap area even when a small phone zooms far out.
        <circle className="isoworld__tap" cx={centre.x} cy={centre.y - h / 2} r={tapR} />
      )}
    </g>
  );
}

function nodeKindFill(node: RenderNode): string {
  if (node.state === 'buildable' || node.state === 'built' || node.state === 'locked') return 'facility';
  if (node.target) return 'interactive';
  return 'prop';
}

/** Cheap lighten/darken for the neutral debug blocks. */
function shade(hex: string, amount: number): string {
  if (!hex.startsWith('#')) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}

export type { ScreenPoint };
