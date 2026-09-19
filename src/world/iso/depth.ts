// Isometric depth sorting. Never hard-code z-index: draw order is derived from world coordinates
// so a character standing behind a sofa is overlapped by it once real sprites exist.

import type { GridPos } from './coordinates';

/**
 * Draw passes. Ground always paints under the scene regardless of coordinates;
 * within the scene pass everything is sorted by its depth anchor.
 */
export const RENDER_PASS = {
  GROUND: 0,   // floor tiles, floor decals / zone markers
  SCENE: 1,    // walls, objects, characters - depth sorted together
  OVERLAY: 2,  // markers, debug, world-space badges
} as const;
export type RenderPass = (typeof RENDER_PASS)[keyof typeof RENDER_PASS];

/**
 * Tie-break bias inside one depth anchor: a wall on the same tile line sits behind an object,
 * an object behind a character standing on it.
 */
export const DEPTH_BIAS = {
  FLOOR: -3,
  ZONE: -2,
  WALL: -1,
  OBJECT: 0,
  CHARACTER: 1,
  MARKER: 2,
} as const;
export type DepthBias = (typeof DEPTH_BIAS)[keyof typeof DEPTH_BIAS];

/**
 * Depth key for a node anchored at `anchor`.
 * Larger = closer to the camera = drawn later.
 */
export function depthKey(anchor: GridPos, bias: number = DEPTH_BIAS.OBJECT): number {
  const z = anchor.z ?? 0;
  return (anchor.x + anchor.y) * 100 + z * 10 + bias;
}

export interface DepthSortable {
  id: string;
  pass: RenderPass;
  depth: number;
}

/** Stable painter's-algorithm ordering: pass, then depth, then id for determinism. */
export function sortByDepth<T extends DepthSortable>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    if (a.pass !== b.pass) return a.pass - b.pass;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** True when `a` should be painted before (behind) `b`. */
export function isBehind(a: DepthSortable, b: DepthSortable): boolean {
  if (a.pass !== b.pass) return a.pass < b.pass;
  if (a.depth !== b.depth) return a.depth < b.depth;
  return a.id < b.id;
}
