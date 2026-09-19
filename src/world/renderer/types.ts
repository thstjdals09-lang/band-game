// Renderer contract. Any renderer (the SVG debug view now, Phaser later) consumes this scene
// and must honour the supplied draw order - it may not invent its own z-index.

import type { Camera } from '../iso/camera';
import type { Footprint, GridPos } from '../iso/coordinates';
import type { IsoProjection } from '../iso/projection';
import type { RenderPass } from '../iso/depth';
import type { BasecampMap, SpawnPoint } from '../maps/types';
import type { OccupancyConflict } from '../iso/occupancy';
import type { SpritePlacement } from '../assets/testSprite';

export type RenderNodeKind = 'floor' | 'wall' | 'zone' | 'object' | 'character' | 'spawn';

export interface RenderNode {
  id: string;
  kind: RenderNodeKind;
  pass: RenderPass;
  depth: number;
  /** Anchor tile used for placement and depth. */
  anchor: GridPos;
  /** Floor area the node covers (1x1 for tiles and characters). */
  footprint: Footprint;
  /** Visual height in elevation units, for the debug box and camera head-room. */
  heightUnits: number;
  assetKey?: string;
  label?: string;
  state?: string;
  stateLabel?: string;
  badge?: string;
  /** Route reused on tap; absent = not interactive. */
  target?: string;
  /** Tiles that accept a tap for this node. */
  hitTiles?: GridPos[];
  interactionTile?: GridPos;
  material?: string;
  characterId?: string;
  /** Real image stand-in (WORLD VISUAL FIT TEST). Absent = draw the neutral debug block. */
  sprite?: SpritePlacement;
}

export interface WorldScene {
  map: BasecampMap;
  stage: number;
  mode: 'home' | 'build';
  projection: IsoProjection;
  camera: Camera;
  /** Already depth-sorted: render in array order. */
  nodes: RenderNode[];
  spawnPoints: SpawnPoint[];
  /** Full world-space rect the camera framed. */
  worldBounds: { x: number; y: number; width: number; height: number };
  /** Rect the camera guaranteed to keep on screen (interactive objects + interaction tiles). */
  requiredBounds: { x: number; y: number; width: number; height: number };
  /** Map authoring errors surfaced in the dev lab. */
  occupancyConflicts: OccupancyConflict[];
}

export interface WorldDebugFlags {
  grid: boolean;
  coordinates: boolean;
  footprints: boolean;
  interactionTiles: boolean;
  depthAnchors: boolean;
  spawnPoints: boolean;
  safeArea: boolean;
  /** Draws the real world bounds and the camera's required rect (not a text label). */
  worldBounds: boolean;
}

export const NO_DEBUG: WorldDebugFlags = {
  grid: false, coordinates: false, footprints: false,
  interactionTiles: false, depthAnchors: false, spawnPoints: false, safeArea: false, worldBounds: false,
};

export interface WorldViewProps {
  scene: WorldScene;
  debug?: WorldDebugFlags;
  onSelectObject?: (node: RenderNode) => void;
  onSelectCharacter?: (node: RenderNode) => void;
  /** Reports the tile under a tap on empty floor - used by the dev lab. */
  onPickTile?: (tile: GridPos) => void;
}
