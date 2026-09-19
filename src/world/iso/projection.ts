// Grid <-> screen projection for a fixed 2:1 isometric camera.
//
// IMPORTANT: tile RENDER dimensions are a PROTOTYPE RENDER VARIABLE, not a locked art spec.
// Map data uses logical tile coordinates only; changing the numbers below must never require
// re-authoring a map. Everything downstream (camera, hit test, debug view) reads this config.

import type { Footprint, GridPos } from './coordinates';

export interface IsoProjection {
  /** Full width of one floor tile diamond, in render units. */
  tileWidth: number;
  /** Full height of one floor tile diamond, in render units (2:1 => half the width). */
  tileHeight: number;
  /** Vertical render units for one elevation level (z). */
  elevationHeight: number;
}

/**
 * PROTOTYPE RENDER VARIABLE — used by the debug renderer and the camera fit maths.
 * The final pixel-art tile size is decided during asset production and may differ.
 */
export const PROTOTYPE_PROJECTION: IsoProjection = {
  tileWidth: 128,
  tileHeight: 64,
  elevationHeight: 32,
};

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Centre point of a tile, in unscaled world-render space (camera transform applied later). */
export function gridToScreen(p: GridPos, proj: IsoProjection = PROTOTYPE_PROJECTION): ScreenPoint {
  const z = p.z ?? 0;
  return {
    x: (p.x - p.y) * (proj.tileWidth / 2),
    y: (p.x + p.y) * (proj.tileHeight / 2) - z * proj.elevationHeight,
  };
}

/** Inverse projection. Returns fractional grid coordinates; floor them for a tile index. */
export function screenToGrid(pt: ScreenPoint, proj: IsoProjection = PROTOTYPE_PROJECTION, z = 0): GridPos {
  const halfW = proj.tileWidth / 2;
  const halfH = proj.tileHeight / 2;
  const adjustedY = pt.y + z * proj.elevationHeight;
  const a = pt.x / halfW;
  const b = adjustedY / halfH;
  return { x: (a + b) / 2, y: (b - a) / 2, z };
}

/** Tile index containing a screen point. */
export function screenToTile(pt: ScreenPoint, proj: IsoProjection = PROTOTYPE_PROJECTION, z = 0): GridPos {
  const g = screenToGrid(pt, proj, z);
  return { x: Math.floor(g.x + 0.5), y: Math.floor(g.y + 0.5), z };
}

/** The four corners of a tile diamond, clockwise from the top (north) corner. */
export function tileDiamond(p: GridPos, proj: IsoProjection = PROTOTYPE_PROJECTION): ScreenPoint[] {
  const c = gridToScreen(p, proj);
  const hw = proj.tileWidth / 2;
  const hh = proj.tileHeight / 2;
  return [
    { x: c.x, y: c.y - hh },
    { x: c.x + hw, y: c.y },
    { x: c.x, y: c.y + hh },
    { x: c.x - hw, y: c.y },
  ];
}

/** Outline of a whole footprint area as a diamond polygon (w x h tiles). */
export function footprintDiamond(anchor: GridPos, fp: Footprint, proj: IsoProjection = PROTOTYPE_PROJECTION): ScreenPoint[] {
  const z = anchor.z ?? 0;
  const north = gridToScreen({ x: anchor.x, y: anchor.y, z }, proj);
  const east = gridToScreen({ x: anchor.x + fp.w - 1, y: anchor.y, z }, proj);
  const south = gridToScreen({ x: anchor.x + fp.w - 1, y: anchor.y + fp.h - 1, z }, proj);
  const west = gridToScreen({ x: anchor.x, y: anchor.y + fp.h - 1, z }, proj);
  const hw = proj.tileWidth / 2;
  const hh = proj.tileHeight / 2;
  return [
    { x: north.x, y: north.y - hh },
    { x: east.x + hw, y: east.y },
    { x: south.x, y: south.y + hh },
    { x: west.x - hw, y: west.y },
  ];
}

export const pointsToSvg = (pts: ScreenPoint[]): string => pts.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');

export const round = (n: number): number => Math.round(n * 100) / 100;

/** Screen-space bounding box for a set of grid tiles, expanded for object height. */
export function boundsForTiles(
  tiles: GridPos[],
  proj: IsoProjection = PROTOTYPE_PROJECTION,
  extraTopTiles = 0,
): ScreenRect {
  if (tiles.length === 0) return { x: 0, y: 0, width: proj.tileWidth, height: proj.tileHeight };
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  tiles.forEach((t) => {
    tileDiamond(t, proj).forEach((c) => {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
    });
  });
  minY -= extraTopTiles * proj.elevationHeight;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
