// ISOMETRIC WORLD LAB - QA only, not production UI. Reachable at /dev/world.
// Verifies grid, footprints, depth, interaction tiles, spawn points and camera fit across
// several phone viewports WITHOUT ever moving an object's map coordinate.
import { useMemo, useState } from 'react';
import { useSave } from '@/state/store';
import { useDevStore, type WorldDebugToggles } from '@/state/devStore';
import { TEST_SPRITE_LIMITS } from '@/world/assets/testSprite';
import { DEFAULT_CAMERA_CONFIG } from '@/world';
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
  worldBounds: 'WORLD BOUNDS',
};

export function WorldLabScreen() {
  const save = useSave();
  const flags = useDevStore((s) => s.world);
  const toggleFlag = useDevStore((s) => s.toggleWorldFlag);
  const setFlags = useDevStore((s) => s.setWorldFlags);
  const sprite = useDevStore((s) => s.testSprite);
  const setSprite = useDevStore((s) => s.setTestSprite);
  const resetSprite = useDevStore((s) => s.resetTestSprite);
  const [stage, setStage] = useState(1);
  const [vp, setVp] = useState(VIEWPORTS[2]);
  const [zoom, setZoom] = useState(DEFAULT_CAMERA_CONFIG.defaultZoom);

  const insets = readChromeInsets();
  const map = basecampMapForStage(stage);

  const report = useMemo(() => {
    const scene = buildWorldScene({
      save, stageOverride: stage, mode: 'build', cameraMode: 'play', zoom,
      viewport: { width: vp.width, height: vp.height, insets },
    });
    const instances = resolveObjectInstances(map, save, 'build');
    const grid = new OccupancyGrid(occupancyPlacements(instances));
    const bounds = cameraBoundsOf(map);
    const interactive = scene.nodes.filter((n) => n.kind === 'object' && n.target);
    return { scene, grid, bounds, instances, interactive };
  }, [save, stage, vp, zoom, map, insets]);

  const { scene, grid, bounds, instances, interactive } = report;
  const cam = scene.camera;
  const scale = Math.min(1, 300 / vp.width);
  const onScreen = {
    cx: (bounds.x + bounds.width / 2) * cam.zoom + cam.offsetX,
    cy: (bounds.y + bounds.height / 2) * cam.zoom + cam.offsetY,
  };

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

      <Section title="Play camera zoom">
        <div className="row row--between">
          <span className="rowcard__meta">zoom (PROTOTYPE VARIABLE)</span>
          <span className="stepper">
            <button onClick={() => setZoom((z) => Math.max(DEFAULT_CAMERA_CONFIG.minZoom, +(z - 0.05).toFixed(2)))}>−</button>
            <span>{zoom.toFixed(2)} · tile {Math.round(PROTOTYPE_PROJECTION.tileWidth * zoom)}px</span>
            <button onClick={() => setZoom((z) => Math.min(DEFAULT_CAMERA_CONFIG.maxZoom, +(z + 0.05).toFixed(2)))}>+</button>
          </span>
        </div>
        <div className="row mt12">
          <Btn size="sm" variant="ghost" onClick={() => setZoom(DEFAULT_CAMERA_CONFIG.defaultZoom)}>RESET</Btn>
        </div>
        <div className="rowcard__meta mt8">방 전체를 맞추지 않는다. 화면 밖은 HOME에서 드래그로 탐색한다.</div>
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
            <BasecampWorld mode="build" cameraMode="play" zoom={zoom} pannable={false} interactive={false} stageOverride={stage} insets={insets} debug={flags} />
            <div className="lab__chrome lab__chrome--top" style={{ height: insets.top }} />
            <div className="lab__chrome lab__chrome--bottom" style={{ height: insets.bottom }} />
          </div>
        </div>
        <dl className="kv mt12">
          <dt>zoom</dt><dd>{cam.zoom.toFixed(2)}{cam.clamped ? ' (clamped)' : ''}</dd>
          <dt>drag range X</dt><dd>{Math.round(cam.panBounds.maxX - cam.panBounds.minX)}px</dd>
          <dt>drag range Y</dt><dd>{Math.round(cam.panBounds.maxY - cam.panBounds.minY)}px</dd>
          <dt>character on screen</dt><dd>{Math.round(sprite.heightUnits * PROTOTYPE_PROJECTION.elevationHeight * cam.zoom)}px</dd>
          <dt>offset</dt><dd>{Math.round(cam.offsetX)}, {Math.round(cam.offsetY)}</dd>
          <dt>safe rect</dt><dd>{Math.round(cam.safeRect.x)},{Math.round(cam.safeRect.y)} · {Math.round(cam.safeRect.width)} × {Math.round(cam.safeRect.height)}</dd>
          <dt>safe centre</dt><dd>{Math.round(cam.safeRect.x + cam.safeRect.width / 2)}, {Math.round(cam.safeRect.y + cam.safeRect.height / 2)}</dd>
          <dt>world bounds</dt><dd>{Math.round(bounds.width)} × {Math.round(bounds.height)}</dd>
          <dt>required rect</dt><dd>{Math.round(scene.requiredBounds.width)} × {Math.round(scene.requiredBounds.height)}</dd>
          <dt>world on screen</dt><dd>{Math.round(bounds.width * cam.zoom)} × {Math.round(bounds.height * cam.zoom)}</dd>
          <dt>world centre</dt><dd>{Math.round(onScreen.cx)}, {Math.round(onScreen.cy)}</dd>
          <dt>vertical fill</dt><dd>{Math.round((bounds.height * cam.zoom / Math.max(1, cam.safeRect.height)) * 100)}%</dd>
          <dt>horizontal overflow</dt><dd>{Math.round(Math.max(0, bounds.width * cam.zoom - cam.safeRect.width))}px</dd>
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
          <Btn size="sm" variant="secondary" onClick={() => setFlags({ grid: true, coordinates: true, footprints: true, interactionTiles: true, depthAnchors: true, spawnPoints: true, safeArea: true, worldBounds: true })}>ALL ON</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setFlags({ grid: false, coordinates: false, footprints: false, interactionTiles: false, depthAnchors: false, spawnPoints: false, safeArea: false, worldBounds: false })}>ALL OFF</Btn>
        </div>
        <div className="rowcard__meta mt8">오버레이는 /dev diagnostics가 켜져 있을 때만 실제 HOME에도 적용된다.</div>
      </Section>

      <Section title="Test sprite (visual fit)">
        <div className="rowcard rowcard--stack">
          <div className="row row--between">
            <span className="rowcard__title">{sprite.assetKey}</span>
            <Btn size="sm" variant={sprite.enabled ? 'primary' : 'secondary'} onClick={() => setSprite({ enabled: !sprite.enabled })}>
              {sprite.enabled ? 'ON' : 'OFF'}
            </Btn>
          </div>
          <div className="rowcard__meta mono mt8">
            source {sprite.sourceSize.w}×{sprite.sourceSize.h}px · {sprite.characterId}
          </div>

          <div className="row row--between mt12">
            <span className="rowcard__meta">height (elevation units)</span>
            <span className="stepper">
              <button onClick={() => setSprite({ heightUnits: Math.max(TEST_SPRITE_LIMITS.heightUnits.min, +(sprite.heightUnits - TEST_SPRITE_LIMITS.heightUnits.step).toFixed(2)) })}>−</button>
              <span>{sprite.heightUnits.toFixed(1)} u · {Math.round(sprite.heightUnits * PROTOTYPE_PROJECTION.elevationHeight)}px</span>
              <button onClick={() => setSprite({ heightUnits: Math.min(TEST_SPRITE_LIMITS.heightUnits.max, +(sprite.heightUnits + TEST_SPRITE_LIMITS.heightUnits.step).toFixed(2)) })}>+</button>
            </span>
          </div>

          <div className="row row--between mt12">
            <span className="rowcard__meta">foot anchor X</span>
            <span className="stepper">
              <button onClick={() => setSprite({ footAnchor: { ...sprite.footAnchor, x: sprite.footAnchor.x - TEST_SPRITE_LIMITS.footAnchor.step } })}>−</button>
              <span>{sprite.footAnchor.x}px</span>
              <button onClick={() => setSprite({ footAnchor: { ...sprite.footAnchor, x: sprite.footAnchor.x + TEST_SPRITE_LIMITS.footAnchor.step } })}>+</button>
            </span>
          </div>

          <div className="row row--between mt12">
            <span className="rowcard__meta">foot anchor Y</span>
            <span className="stepper">
              <button onClick={() => setSprite({ footAnchor: { ...sprite.footAnchor, y: sprite.footAnchor.y - TEST_SPRITE_LIMITS.footAnchor.step } })}>−</button>
              <span>{sprite.footAnchor.y}px</span>
              <button onClick={() => setSprite({ footAnchor: { ...sprite.footAnchor, y: sprite.footAnchor.y + TEST_SPRITE_LIMITS.footAnchor.step } })}>+</button>
            </span>
          </div>

          <div className="row mt12">
            <Btn size="sm" variant={sprite.applyToAllCharacters ? 'primary' : 'secondary'} onClick={() => setSprite({ applyToAllCharacters: !sprite.applyToAllCharacters })}>
              모든 캐릭터에 적용
            </Btn>
            <Btn size="sm" variant="ghost" onClick={resetSprite}>RESET</Btn>
          </div>
          <div className="rowcard__meta mt12">값은 개발용이며 최종 규격이 아니다. DEPTH ANCHOR 오버레이를 켜면 발 기준점이 타일 중심에 닿는지 확인할 수 있다.</div>
        </div>
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
