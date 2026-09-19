// Screen -> world hit testing. Taps land on world objects, not on floating UI buttons.

import { footprintTiles, gridKey, type GridPos } from './coordinates';
import { screenToWorld, type Camera } from './camera';
import { PROTOTYPE_PROJECTION, screenToTile, type IsoProjection, type ScreenPoint } from './projection';
import { isBehind, type DepthSortable } from './depth';

/** Tile under a screen point (camera applied). */
export function pickTile(
  screenPt: ScreenPoint,
  cam: Camera,
  proj: IsoProjection = PROTOTYPE_PROJECTION,
  z = 0,
): GridPos {
  return screenToTile(screenToWorld(screenPt, cam), proj, z);
}

export interface HitTarget extends DepthSortable {
  /** Tiles that accept a tap for this target (footprint + interaction tile). */
  tiles: GridPos[];
  interactive: boolean;
}

/**
 * Topmost interactive target covering a tile.
 * Depth order decides ties so a prop in front wins over one behind it.
 */
export function pickTargetAtTile(tile: GridPos, targets: HitTarget[]): HitTarget | null {
  const key = gridKey(tile);
  let best: HitTarget | null = null;
  targets.forEach((t) => {
    if (!t.interactive) return;
    if (!t.tiles.some((p) => gridKey(p) === key)) return;
    if (!best || isBehind(best, t)) best = t;
  });
  return best;
}

export function pickTarget(
  screenPt: ScreenPoint,
  cam: Camera,
  targets: HitTarget[],
  proj: IsoProjection = PROTOTYPE_PROJECTION,
): HitTarget | null {
  return pickTargetAtTile(pickTile(screenPt, cam, proj), targets);
}

/** Tap tiles for an object: its floor footprint plus its interaction tile (if any). */
export function hitTilesFor(anchor: GridPos, footprint: { w: number; h: number }, interactionTile?: GridPos): GridPos[] {
  const tiles = footprintTiles(anchor, footprint);
  if (interactionTile && !tiles.some((t) => t.x === interactionTile.x && t.y === interactionTile.y)) {
    tiles.push(interactionTile);
  }
  return tiles;
}

/**
 * Minimum comfortable tap radius in screen px. Small phones zoom out, so an object can become
 * smaller than a finger; the renderer adds an invisible tap circle of at least this radius.
 */
export const MIN_TAP_RADIUS_PX = 24;

export function tapRadiusFor(footprintTileCount: number, cam: Camera, proj: IsoProjection = PROTOTYPE_PROJECTION): number {
  const natural = (Math.sqrt(Math.max(1, footprintTileCount)) * proj.tileWidth * cam.zoom) / 4;
  return Math.max(MIN_TAP_RADIUS_PX, natural);
}
