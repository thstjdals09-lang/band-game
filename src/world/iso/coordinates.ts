// Logical isometric grid coordinates. NOTHING here knows about pixels or the screen.
// A map is authored in these coordinates and never changes per device.

export interface GridPos {
  x: number;
  y: number;
  /** Elevation level in whole tiles. 0 = floor. */
  z?: number;
}

export interface Footprint {
  /** Tiles along the +x axis. */
  w: number;
  /** Tiles along the +y axis. */
  h: number;
}

export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const gridKey = (p: GridPos): string => `${p.x},${p.y}`;

export const sameTile = (a: GridPos, b: GridPos): boolean => a.x === b.x && a.y === b.y;

export const addGrid = (a: GridPos, b: GridPos): GridPos => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: (a.z ?? 0) + (b.z ?? 0),
});

/** All tiles covered by a footprint anchored at `anchor` (anchor is the min-x / min-y corner). */
export function footprintTiles(anchor: GridPos, fp: Footprint): GridPos[] {
  const out: GridPos[] = [];
  for (let dy = 0; dy < fp.h; dy += 1) {
    for (let dx = 0; dx < fp.w; dx += 1) {
      out.push({ x: anchor.x + dx, y: anchor.y + dy, z: anchor.z ?? 0 });
    }
  }
  return out;
}

export function footprintRect(anchor: GridPos, fp: Footprint): GridRect {
  return { x: anchor.x, y: anchor.y, w: fp.w, h: fp.h };
}

export function rectContains(rect: GridRect, p: GridPos): boolean {
  return p.x >= rect.x && p.x < rect.x + rect.w && p.y >= rect.y && p.y < rect.y + rect.h;
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function rectTiles(rect: GridRect): GridPos[] {
  return footprintTiles({ x: rect.x, y: rect.y }, { w: rect.w, h: rect.h });
}

/**
 * The tile of a footprint that is visually closest to the camera (largest x+y).
 * Used as the default depth anchor so tall props sort against characters correctly.
 */
export function frontTile(anchor: GridPos, fp: Footprint): GridPos {
  return { x: anchor.x + fp.w - 1, y: anchor.y + fp.h - 1, z: anchor.z ?? 0 };
}

/** The tile furthest from the camera (smallest x+y). */
export function backTile(anchor: GridPos, _fp?: Footprint): GridPos {
  return { x: anchor.x, y: anchor.y, z: anchor.z ?? 0 };
}

export const ORTHO_NEIGHBOURS: GridPos[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

export function neighbours(p: GridPos): GridPos[] {
  return ORTHO_NEIGHBOURS.map((n) => ({ x: p.x + n.x, y: p.y + n.y, z: p.z ?? 0 }));
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
