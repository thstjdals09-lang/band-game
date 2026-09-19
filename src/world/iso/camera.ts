// Camera. The map is the same on every device - ONLY the camera changes.
// Object grid coordinates are never rebound per viewport; a small phone zooms out instead.

import type { GridPos } from './coordinates';
import { boundsForTiles, gridToScreen, PROTOTYPE_PROJECTION, type IsoProjection, type ScreenPoint, type ScreenRect } from './projection';

export interface ViewportInsets {
  /** HUD height in CSS px (world is drawn under it, camera must not frame content there). */
  top: number;
  /** Bottom Dock height in CSS px. */
  bottom: number;
  left: number;
  right: number;
}

export const NO_INSETS: ViewportInsets = { top: 0, bottom: 0, left: 0, right: 0 };

export interface Viewport {
  width: number;
  height: number;
  insets: ViewportInsets;
}

export interface CameraConfig {
  minZoom: number;
  maxZoom: number;
  /** Breathing room inside the safe viewport, in CSS px. */
  padding: number;
}

/** PROTOTYPE RENDER VARIABLE - tuned for the debug renderer, not a locked art spec. */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.18,
  maxZoom: 1,
  padding: 8,
};

export interface Camera {
  /** Scale applied to world render units. */
  zoom: number;
  /** Screen translation applied after scaling. */
  offsetX: number;
  offsetY: number;
  /** Region of the viewport that is not covered by HUD / Dock. */
  safeRect: ScreenRect;
  /** World-space rect the camera was fitted to. */
  worldBounds: ScreenRect;
  /** True when the fit hit the zoom clamp and content may extend past the safe rect. */
  clamped: boolean;
}

export function safeRectOf(viewport: Viewport): ScreenRect {
  const { width, height, insets } = viewport;
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, width - insets.left - insets.right),
    height: Math.max(0, height - insets.top - insets.bottom),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Fit a world-space rect into the safe viewport.
 * `pan` shifts the camera in screen px and is clamped to keep the world in view.
 */
export function fitCamera(
  worldBounds: ScreenRect,
  viewport: Viewport,
  config: CameraConfig = DEFAULT_CAMERA_CONFIG,
  pan: ScreenPoint = { x: 0, y: 0 },
): Camera {
  const safeRect = safeRectOf(viewport);
  const availW = Math.max(1, safeRect.width - config.padding * 2);
  const availH = Math.max(1, safeRect.height - config.padding * 2);
  const rawZoom = Math.min(availW / Math.max(1, worldBounds.width), availH / Math.max(1, worldBounds.height));
  const zoom = clamp(rawZoom, config.minZoom, config.maxZoom);
  const clamped = rawZoom < config.minZoom || rawZoom > config.maxZoom;

  const worldCx = worldBounds.x + worldBounds.width / 2;
  const worldCy = worldBounds.y + worldBounds.height / 2;
  const offsetX = safeRect.x + safeRect.width / 2 - worldCx * zoom + pan.x;
  const offsetY = safeRect.y + safeRect.height / 2 - worldCy * zoom + pan.y;

  return { zoom, offsetX, offsetY, safeRect, worldBounds, clamped };
}

/** World render units -> screen px. */
export function worldToScreen(pt: ScreenPoint, cam: Camera): ScreenPoint {
  return { x: pt.x * cam.zoom + cam.offsetX, y: pt.y * cam.zoom + cam.offsetY };
}

/** Screen px -> world render units. */
export function screenToWorld(pt: ScreenPoint, cam: Camera): ScreenPoint {
  return { x: (pt.x - cam.offsetX) / cam.zoom, y: (pt.y - cam.offsetY) / cam.zoom };
}

/** Screen px of a grid tile centre, camera applied. */
export function gridToViewport(p: GridPos, cam: Camera, proj: IsoProjection = PROTOTYPE_PROJECTION): ScreenPoint {
  return worldToScreen(gridToScreen(p, proj), cam);
}

/** Is the tile centre inside the safe (non-chrome) part of the viewport? */
export function isTileInSafeArea(p: GridPos, cam: Camera, proj: IsoProjection = PROTOTYPE_PROJECTION): boolean {
  const s = gridToViewport(p, cam, proj);
  const r = cam.safeRect;
  return s.x >= r.x && s.x <= r.x + r.width && s.y >= r.y && s.y <= r.y + r.height;
}

/**
 * Focused fit: zoom as far IN as possible while the `required` rect (every interactive object and
 * its interaction tile) still fits the safe viewport, never past `full` cover.
 * A rectangular room always projects to a 2:1 diamond, so a portrait phone has vertical slack;
 * this keeps the room as large as it can be without pushing any tappable object off screen.
 */
export function fitCameraFocused(
  full: ScreenRect,
  required: ScreenRect,
  viewport: Viewport,
  config: CameraConfig = DEFAULT_CAMERA_CONFIG,
  pan: ScreenPoint = { x: 0, y: 0 },
): Camera {
  const safeRect = safeRectOf(viewport);
  const availW = Math.max(1, safeRect.width - config.padding * 2);
  const availH = Math.max(1, safeRect.height - config.padding * 2);

  const zoomForRequired = Math.min(availW / Math.max(1, required.width), availH / Math.max(1, required.height));
  const zoomToCoverFull = Math.max(availW / Math.max(1, full.width), availH / Math.max(1, full.height));
  const raw = Math.min(zoomForRequired, zoomToCoverFull);
  const zoom = clamp(raw, config.minZoom, config.maxZoom);

  // Centre on the required content so any cropping happens on empty floor at the edges.
  const cx = required.x + required.width / 2;
  const cy = required.y + required.height / 2;
  return {
    zoom,
    offsetX: safeRect.x + safeRect.width / 2 - cx * zoom + pan.x,
    offsetY: safeRect.y + safeRect.height / 2 - cy * zoom + pan.y,
    safeRect,
    worldBounds: full,
    clamped: raw < config.minZoom || raw > config.maxZoom,
  };
}

/** Convenience: fit the camera to a set of tiles (plus head-room for tall props). */
export function fitCameraToTiles(
  tiles: GridPos[],
  viewport: Viewport,
  config: CameraConfig = DEFAULT_CAMERA_CONFIG,
  proj: IsoProjection = PROTOTYPE_PROJECTION,
  extraTopTiles = 1.5,
): Camera {
  return fitCamera(boundsForTiles(tiles, proj, extraTopTiles), viewport, config);
}

/** Reads --hud-h / --dock-h from the document so layout stays single-sourced in tokens.css. */
export function readChromeInsets(doc: Document = document): ViewportInsets {
  const parsePx = (raw: string, fallback: number) => {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  try {
    const cs = getComputedStyle(doc.documentElement);
    return {
      top: parsePx(cs.getPropertyValue('--hud-h'), 42),
      bottom: parsePx(cs.getPropertyValue('--dock-h'), 66),
      left: 0,
      right: 0,
    };
  } catch {
    return { top: 42, bottom: 66, left: 0, right: 0 };
  }
}
