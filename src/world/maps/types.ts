// Map data model. Authored in logical grid coordinates only - never in screen percentages.
// A map is immutable master data; mutable world state comes from SaveData.

import type { GridPos, GridRect } from '../iso/coordinates';
import type { ObjectDefId } from '../objects/definitions';

export type FloorMaterial = 'CONCRETE' | 'RUG' | 'BOOTH';
export type WallSide = 'NORTH' | 'WEST';

export interface FloorTile {
  pos: GridPos;
  material: FloorMaterial;
  /** Zone tag for authoring / debug readability. */
  zone?: string;
}

export interface WallTile {
  pos: GridPos;
  side: WallSide;
  heightUnits: number;
}

export interface MapObjectPlacement {
  instanceId: string;
  defId: ObjectDefId;
  /** Min-corner tile of the object's footprint. */
  anchor: GridPos;
}

export type SpawnKind = 'PERFORM' | 'IDLE' | 'DESK' | 'SOFA';

export interface SpawnPoint {
  id: string;
  kind: SpawnKind;
  pos: GridPos;
  /** Lineup slot this performing position belongs to, when applicable. */
  slotId?: 'VOCAL' | 'GUITAR' | 'BASS' | 'DRUMS' | 'KEYS';
  label: string;
}

export interface BasecampMap {
  id: string;
  /** Basecamp visual stage this map represents (1 = starting practice room). */
  stage: number;
  label: string;
  /** Logical map extent. Tiles outside this rect do not exist. */
  width: number;
  height: number;
  floorTiles: FloorTile[];
  wallTiles: WallTile[];
  objects: MapObjectPlacement[];
  spawnPoints: SpawnPoint[];
  /** Tiles the camera must keep framed. */
  cameraBounds: GridRect;
}

/** A partial, additive change on top of a base map (never a whole-image swap). */
export interface MapPatch {
  id: string;
  stage: number;
  label: string;
  addFloorTiles?: FloorTile[];
  addWallTiles?: WallTile[];
  removeWallTilesAt?: GridPos[];
  addObjects?: MapObjectPlacement[];
  removeObjectIds?: string[];
  addSpawnPoints?: SpawnPoint[];
  cameraBounds?: GridRect;
}

const key = (p: GridPos) => `${p.x},${p.y}`;

export function applyMapPatch(base: BasecampMap, patch: MapPatch): BasecampMap {
  const removedWalls = new Set((patch.removeWallTilesAt ?? []).map(key));
  const removedObjects = new Set(patch.removeObjectIds ?? []);
  return {
    id: patch.id,
    stage: patch.stage,
    label: patch.label,
    width: base.width,
    height: base.height,
    floorTiles: [...base.floorTiles, ...(patch.addFloorTiles ?? [])],
    wallTiles: [...base.wallTiles.filter((w) => !removedWalls.has(key(w.pos))), ...(patch.addWallTiles ?? [])],
    objects: [...base.objects.filter((o) => !removedObjects.has(o.instanceId)), ...(patch.addObjects ?? [])],
    spawnPoints: [...base.spawnPoints, ...(patch.addSpawnPoints ?? [])],
    cameraBounds: patch.cameraBounds ?? base.cameraBounds,
  };
}

export function allMapTiles(map: BasecampMap): GridPos[] {
  return [...map.floorTiles.map((t) => t.pos), ...map.wallTiles.map((t) => t.pos)];
}

export function hasFloorAt(map: BasecampMap, p: GridPos): boolean {
  return map.floorTiles.some((t) => t.pos.x === p.x && t.pos.y === p.y);
}

export function spawnById(map: BasecampMap, id: string): SpawnPoint | undefined {
  return map.spawnPoints.find((s) => s.id === id);
}

export function spawnForSlot(map: BasecampMap, slotId: string): SpawnPoint | undefined {
  return map.spawnPoints.find((s) => s.kind === 'PERFORM' && s.slotId === slotId);
}
