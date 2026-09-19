// SaveData + map -> WorldScene. Pure: no React, no DOM. The scene is derived every frame and
// never stored (Character Master §14: current derived values are recomputed).

import type { SaveData } from '@/state/save/schema';
import { basecampStage } from '@/state/selectors';
import { createCamera, fitCameraFocused, type Camera, type Viewport } from '../iso/camera';
import { footprintTiles, rectTiles, type GridPos } from '../iso/coordinates';
import { DEPTH_BIAS, depthKey, RENDER_PASS, sortByDepth } from '../iso/depth';
import { OccupancyGrid } from '../iso/occupancy';
import { boundsForTiles, PROTOTYPE_PROJECTION, type IsoProjection, type ScreenRect } from '../iso/projection';
import { basecampMapForStage, type BasecampMap } from '../maps';
import { occupancyPlacements, resolveCharacterPlacements, resolveObjectInstances, type WorldMode } from '../objects/instances';
import { CHARACTER_SPRITE_CONTRACT } from '../assets/contract';
import { spriteFor, type TestSpriteParams } from '../assets/testSprite';
import { OBJECT_DEFINITIONS } from '../objects/definitions';
import type { CameraMode, RenderNode, WorldScene } from './types';
import type { ScreenPoint } from '../iso/projection';

const OBJECT_HEIGHTS: Record<string, number> = Object.fromEntries(
  Object.values(OBJECT_DEFINITIONS).map((d) => [d.id, d.heightUnits]),
);

const TILE_ASSET: Record<string, string> = {
  CONCRETE: 'TILE_FLOOR_CONCRETE',
  RUG: 'TILE_FLOOR_RUG',
  BOOTH: 'TILE_FLOOR_BOOTH',
};

export interface BuildSceneInput {
  save: SaveData;
  viewport: Viewport;
  mode?: WorldMode;
  projection?: IsoProjection;
  /** Override the stage (dev lab). Defaults to the stage derived from SaveData. */
  stageOverride?: number;
  /** WORLD VISUAL FIT TEST stand-in sprite (development only). */
  testSprite?: TestSpriteParams;
  /** 'play' (default for HOME) keeps a readable zoom and lets the player drag; 'fit' frames everything. */
  cameraMode?: CameraMode;
  /** Play-camera drag offset in screen px (clamped inside the camera). */
  pan?: ScreenPoint;
  /** Play-camera zoom override (dev lab). */
  zoom?: number;
}

export function buildWorldScene(input: BuildSceneInput): WorldScene {
  const { save, viewport } = input;
  const mode: WorldMode = input.mode ?? 'home';
  const projection = input.projection ?? PROTOTYPE_PROJECTION;
  const stage = input.stageOverride ?? basecampStage(save);
  const map = basecampMapForStage(stage);

  const objects = resolveObjectInstances(map, save, mode);
  const characters = resolveCharacterPlacements(map, save);
  const occupancy = new OccupancyGrid(occupancyPlacements(objects));

  const nodes: RenderNode[] = [];

  map.floorTiles.forEach((t) => {
    nodes.push({
      id: `floor:${t.pos.x},${t.pos.y}`,
      kind: 'floor',
      pass: RENDER_PASS.GROUND,
      depth: depthKey(t.pos, DEPTH_BIAS.FLOOR),
      anchor: t.pos,
      footprint: { w: 1, h: 1 },
      heightUnits: 0,
      assetKey: TILE_ASSET[t.material],
      material: t.material,
    });
  });

  map.wallTiles.forEach((t) => {
    nodes.push({
      id: `wall:${t.pos.x},${t.pos.y}`,
      kind: 'wall',
      pass: RENDER_PASS.SCENE,
      depth: depthKey(t.pos, DEPTH_BIAS.WALL),
      anchor: t.pos,
      footprint: { w: 1, h: 1 },
      heightUnits: t.heightUnits,
      assetKey: 'TILE_WALL_CONCRETE',
      material: t.side,
    });
  });

  objects.forEach((o) => {
    const isZone = o.def.kind === 'zone';
    nodes.push({
      id: `object:${o.instanceId}`,
      kind: isZone ? 'zone' : 'object',
      pass: isZone ? RENDER_PASS.GROUND : RENDER_PASS.SCENE,
      depth: depthKey(o.depthAnchor, isZone ? DEPTH_BIAS.ZONE : DEPTH_BIAS.OBJECT),
      anchor: o.anchor,
      footprint: o.def.footprint,
      heightUnits: o.def.heightUnits,
      assetKey: o.assetKey,
      label: o.label,
      state: o.state,
      stateLabel: o.stateLabel,
      badge: o.badge,
      target: isZone ? undefined : o.target,
      hitTiles: o.hitTiles,
      interactionTile: o.interactionTile,
    });
  });

  characters.forEach((c) => {
    nodes.push({
      id: `character:${c.id}`,
      kind: 'character',
      pass: RENDER_PASS.SCENE,
      depth: depthKey(c.pos, DEPTH_BIAS.CHARACTER),
      anchor: c.pos,
      footprint: { w: 1, h: 1 },
      heightUnits: CHARACTER_SPRITE_CONTRACT.heightUnits,
      assetKey: c.assetKey,
      label: c.label,
      state: c.pose,
      hitTiles: [c.pos],
      characterId: c.characterId,
      sprite: input.testSprite ? spriteFor(input.testSprite, c.characterId) : undefined,
      target: c.characterId ? `/?member=${c.characterId}` : '/band',
    });
  });

  // Camera frames the authored bounds, but never at the cost of an unreachable tappable object.
  const requiredTiles = nodes
    .filter((n) => n.target && n.kind === 'object')
    .flatMap((n) => n.hitTiles ?? [n.anchor]);
  const required = requiredTiles.length > 0
    ? boundsForTiles(requiredTiles, projection, 2)
    : cameraBoundsOf(map, projection);
  const full = cameraBoundsOf(map, projection);
  // Build/preview surfaces still frame the whole room; the playable world does not.
  const cameraMode: CameraMode = input.cameraMode ?? (mode === 'build' ? 'fit' : 'play');
  const camera = cameraMode === 'fit'
    ? fitCameraFocused(full, required, viewport)
    : createCamera({ worldBounds: full, focus: focusPointOf(map, projection), viewport, zoom: input.zoom, pan: input.pan });

  return {
    map,
    stage: map.stage,
    mode,
    projection,
    camera,
    cameraMode,
    worldBounds: full,
    requiredBounds: required,
    nodes: sortByDepth(nodes),
    spawnPoints: map.spawnPoints,
    occupancyConflicts: occupancy.conflicts(),
  };
}

/**
 * World-space rect the camera must frame: the authored camera bounds plus head-room for the
 * tallest wall / prop so nothing is clipped at the top.
 */
export function cameraBoundsOf(map: BasecampMap, projection: IsoProjection = PROTOTYPE_PROJECTION): ScreenRect {
  const tiles: GridPos[] = rectTiles(map.cameraBounds);
  const tallestWall = map.wallTiles.reduce((m, w) => Math.max(m, w.heightUnits), 0);
  const tallestProp = map.objects.reduce((m, o) => Math.max(m, OBJECT_HEIGHTS[o.defId] ?? 0), 0);
  return boundsForTiles(tiles, projection, Math.max(tallestWall, tallestProp, 1));
}

/** Where the play camera looks when the drag offset is zero: the centre of the actual floor. */
export function focusPointOf(map: BasecampMap, projection: IsoProjection = PROTOTYPE_PROJECTION): ScreenPoint {
  const floor = boundsForTiles(map.floorTiles.map((t) => t.pos), projection, 0);
  return { x: floor.x + floor.width / 2, y: floor.y + floor.height / 2 };
}

/** All tiles an object covers - exported for the dev lab and tests. */
export function occupiedTilesOf(anchor: GridPos, footprint: { w: number; h: number }): GridPos[] {
  return footprintTiles(anchor, footprint);
}

export type { Camera };
