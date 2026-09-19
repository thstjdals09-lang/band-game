// ISOMETRIC WORLD LAB - QA only, not production UI. Reachable at /dev/world.
// Verifies grid, footprints, depth, interaction tiles, spawn points and camera fit across
// several phone viewports WITHOUT ever moving an object's map coordinate.
import { useMemo, useState } from 'react';
import { useSave } from '@/state/store';
import { useDevStore, type WorldDebugToggles } from '@/state/devStore';
import { BasecampWorld } from '@/world/BasecampWorld';
import {
  basecampMapForStage, buildWorldScene, cameraBoundsOf,
  occupancyPlacements, OccupancyGrid, readChromeInsets, resolveObjectInstances, PROTOTYPE_PROJECTION,
} from '@/world';
import { Panel } from '@/components/Panel';
import { Btn, Section, Tag } from '@/components/ui';

interface Preset { label: string; width: number; height: number }
const VIEWPORTS: Preset[] = [
  { label: '320 × 568', width: 320, height: 568 },
  { label: '375 × 667', width: 375, height: 667 },
  { label: '390 × 844', width: 390, height: 844 },
  { label: '393 × 852', width: 393, height: 852 },
  { label: '430 × 932', width: 430, height: 932 },
];

const TOGGLE_LABELS: Record<keyof WorldDebugToggles, string> = {
  grid: 'SHOW GRID',
  coordinates: 'TILE COORDS',
  footprints: 'FOOTPRINT',
  interactionTiles: 'INTERACTION TILE',
  depthAnchors: 'DEPTH ANCHOR',
  spawnPoints: 'SPAWN POINTS',
  safeArea: 'CAMERA SAFE AREA',
};

export function WorldLabScreen() {
  const save = useSave();
  const flags = useDevStore((s) => s.world);
  const toggleFlag = useDevStore((s) => s.toggleWorldFlag);
  const setFlags = useDevStore((s) => s.setWorldFlags);
  const [stage, setStage] = useState(1);
  const [vp, setVp] = useState(VIEWPORTS[2]);

  const insets = readChromeInsets();
  const map = basecampMapForStage(stage);

  const report = useMemo(() => {
    const scene = buildWorldScene({
      save, stageOverride: stage, mode: 'build',
      viewport: { width: vp.width, height: vp.height, insets },
    });
    const instances = resolveObjectInstances(map, save, 'build');
    const grid = new OccupancyGrid(occupancyPlacements(instances));
    const bounds = cameraBoundsOf(map);
    const interactive = scene.nodes.filter((n) => n.kind === 'object' && n.target);
    return { scene, grid, bounds, instances, interactive };
  }, [save, stage, vp, map, insets]);

  const { scene, grid, bounds, instances, interactive } = report;
  const cam = scene.camera;
  const scale = Math.min(1, 300 / vp.width);

  return (
    <Panel title="ISOMETRIC WORLD LAB" subtitle="QA only" nav="back">
      <Section title="Stage">
        <div className="seg">
          <button className={stage === 1 ? 'on' : ''} onClick={() => setStage(1)}>STAGE 1</button>
          <button className={stage === 2 ? 'on' : ''} onClick={() => setStage(2)}>STAGE 2</button>
        </div>
        <div className="rowcard mt12">
          <span className="grow">
            <div className="rowcard__title">{map.label}</div>
            <div className="rowcard__meta">floor {map.floorTiles.length} · wall {map.wallTiles.length} · objects {map.objects.length} · spawns {map.spawnPoints.length}</div>
          </span>
          <Tag tone={scene.occupancyConflicts.length === 0 ? 'ok' : 'accent'}>
            {scene.occupancyConflicts.length === 0 ? 'no overlap' : `${scene.occupancyConflicts.length} overlap`}
          </Tag>
        </div>
      </Section>

      <Section title="Viewport preset">
        <div className="seg seg--scroll">
          {VIEWPORTS.map((v) => (
            <button key={v.label} className={vp.label === v.label ? 'on' : ''} onClick={() => setVp(v)}>{v.label}</button>
          ))}
        </div>
        <div
          className="lab__frame mt12"
          style={{ width: vp.width * scale, height: vp.height * scale }}
        >
          <div style={{ width: vp.width, height: vp.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <BasecampWorld mode="build" interactive={false} stageOverride={stage} insets={insets} debug={flags} />
            <div className="lab__chrome lab__chrome--top" style={{ height: insets.top }} />
            <div className="lab__chrome lab__chrome--bottom" style={{ height: insets.bottom }} />
          </div>
        </div>
        <dl className="kv mt12">
          <dt>zoom</dt><dd>{cam.zoom.toFixed(3)}{cam.clamped ? ' (clamped)' : ''}</dd>
          <dt>offset</dt><dd>{Math.round(cam.offsetX)}, {Math.round(cam.offsetY)}</dd>
          <dt>safe rect</dt><dd>{Math.round(cam.safeRect.width)} × {Math.round(cam.safeRect.height)}</dd>
          <dt>world bounds</dt><dd>{Math.round(bounds.width)} × {Math.round(bounds.height)}</dd>
          <dt>tile render</dt><dd>{PROTOTYPE_PROJECTION.tileWidth} × {PROTOTYPE_PROJECTION.tileHeight}</dd>
        </dl>
      </Section>

      <Section title="Overlays">
        <div className="lab__toggles">
          {(Object.keys(TOGGLE_LABELS) as (keyof WorldDebugToggles)[]).map((k) => (
            <button key={k} className={`lab__toggle ${flags[k] ? 'on' : ''}`} onClick={() => toggleFlag(k)}>
              {TOGGLE_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="row mt12">
          <Btn size="sm" variant="secondary" onClick={() => setFlags({ grid: true, coordinates: true, footprints: true, interactionTiles: true, depthAnchors: true, spawnPoints: true, safeArea: true })}>ALL ON</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setFlags({ grid: false, coordinates: false, footprints: false, interactionTiles: false, depthAnchors: false, spawnPoints: false, safeArea: false })}>ALL OFF</Btn>
        </div>
        <div className="rowcard__meta mt8">오버레이는 /dev diagnostics가 켜져 있을 때만 실제 HOME에도 적용된다.</div>
      </Section>

      <Section title={`Objects (${instances.length})`}>
        {instances.map((o) => (
          <div key={o.instanceId} className="rowcard rowcard--stack">
            <div className="row row--between">
              <span className="rowcard__title">{o.label}</span>
              <Tag tone={o.target ? 'ok' : 'mute'}>{o.state}</Tag>
            </div>
            <div className="rowcard__meta mono mt8">
              anchor ({o.anchor.x},{o.anchor.y}) · fp {o.def.footprint.w}×{o.def.footprint.h} · depth ({o.depthAnchor.x},{o.depthAnchor.y})
              {o.interactionTile ? ` · touch (${o.interactionTile.x},${o.interactionTile.y})` : ''}
              {o.def.wallMounted ? ' · wall' : ''}
            </div>
            <div className="rowcard__meta mono">occupies {o.occupiedTiles.length} tiles · {o.target ?? 'no target'}</div>
          </div>
        ))}
      </Section>

      <Section title={`Spawn points (${map.spawnPoints.length})`}>
        {map.spawnPoints.map((s) => (
          <div key={s.id} className="rowcard">
            <span className="grow mono label">{s.id}</span>
            <span className="rowcard__meta mono">({s.pos.x},{s.pos.y}) {s.slotId ?? s.kind}</span>
            <Tag tone={grid.isBlocked(s.pos) ? 'accent' : 'mute'}>{grid.isBlocked(s.pos) ? 'blocked' : 'free'}</Tag>
          </div>
        ))}
      </Section>

      <Section title="Draw order (depth sorted)">
        <div className="rowcard rowcard--stack">
          {scene.nodes.filter((n) => n.kind !== 'floor' && n.kind !== 'wall').map((n, i) => (
            <div key={n.id} className="rowcard__meta mono">{String(i).padStart(2, '0')} · p{n.pass} d{n.depth} · {n.id}</div>
          ))}
        </div>
        <div className="rowcard__meta mt8">interactive objects: {interactive.length}</div>
      </Section>
    </Panel>
  );
}
