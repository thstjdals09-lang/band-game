// Floor occupancy. Objects reserve tiles through their FOOTPRINT, never through an image
// bounding box. Walls / wall-mounted props reserve nothing on the floor.

import { footprintTiles, gridKey, type Footprint, type GridPos } from './coordinates';

export interface OccupantPlacement {
  id: string;
  anchor: GridPos;
  footprint: Footprint;
  /** false = decorative zone marker that does not reserve the floor */
  blocking: boolean;
}

export interface OccupancyConflict {
  tile: GridPos;
  ids: string[];
}

export class OccupancyGrid {
  private readonly cells = new Map<string, string[]>();

  constructor(placements: OccupantPlacement[] = []) {
    placements.forEach((p) => this.add(p));
  }

  add(p: OccupantPlacement): void {
    if (!p.blocking) return;
    footprintTiles(p.anchor, p.footprint).forEach((t) => {
      const k = gridKey(t);
      const list = this.cells.get(k);
      if (list) list.push(p.id); else this.cells.set(k, [p.id]);
    });
  }

  occupantsAt(tile: GridPos): string[] {
    return this.cells.get(gridKey(tile)) ?? [];
  }

  isBlocked(tile: GridPos): boolean {
    return this.occupantsAt(tile).length > 0;
  }

  /** Tiles claimed by more than one blocking object - an authoring error in the map data. */
  conflicts(): OccupancyConflict[] {
    const out: OccupancyConflict[] = [];
    this.cells.forEach((ids, key) => {
      if (ids.length > 1) {
        const [x, y] = key.split(',').map(Number);
        out.push({ tile: { x, y }, ids: [...ids] });
      }
    });
    return out.sort((a, b) => (a.tile.y - b.tile.y) || (a.tile.x - b.tile.x));
  }

  get size(): number {
    return this.cells.size;
  }
}

/** Would placing `candidate` overlap anything already blocking? */
export function wouldOverlap(grid: OccupancyGrid, candidate: OccupantPlacement): boolean {
  if (!candidate.blocking) return false;
  return footprintTiles(candidate.anchor, candidate.footprint).some((t) => {
    const ids = grid.occupantsAt(t);
    return ids.some((id) => id !== candidate.id);
  });
}
