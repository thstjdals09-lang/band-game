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
  /**
   * Play-mode zoom. The room is deliberately NOT fitted to the screen: characters and furniture
   * are drawn at a readable size and the rest of the world is reached by dragging.
   * PROTOTYPE RENDER VARIABLE - tune in /dev/world, not locked.
   */
  defaultZoom: number;
  /** How far past a world edge a drag may pull, in CSS px. */
  panMargin: number;
}

/** PROTOTYPE RENDER VARIABLE - tuned for the debug renderer, not a locked art spec. */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.18,
  maxZoom: 2,
  padding: 8,
  defaultZoom: 1,
  panMargin: 72,
};

/** Range a drag may move the camera on one axis. */
export interface PanBounds {
  minX: number; maxX: number; minY: number; maxY: number;
}

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
  /** True when the zoom hit the min/max clamp. */
  clamped: boolean;
  /** Applied drag offset, already clamped. */
  pan: ScreenPoint;
  /** Allowed drag range on both axes; 0-width means that axis needs no panning. */
  panBounds: PanBounds;
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

/** Fit cameras frame everything, so they expose no drag range. */
const ZERO_PAN_BOUNDS: PanBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

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

  return { zoom, offsetX, offsetY, safeRect, worldBounds, clamped, pan: { ...pan }, panBounds: ZERO_PAN_BOUNDS };
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
    pan: { ...pan },
    panBounds: ZERO_PAN_BOUNDS,
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


// ---------------------------------------------------------------------------------------------
// Play camera: fixed readable zoom + free two-axis drag.
// The whole room is intentionally NOT framed; the player drags to explore it.
// ---------------------------------------------------------------------------------------------

/** Clamp one axis so a drag can reach every edge without losing the world off screen. */
function clampAxis(
  contentStartAtZeroPan: number,
  contentSize: number,
  safeStart: number,
  safeSize: number,
  margin: number,
  value: number,
): { value: number; min: number; max: number } {
  let min: number;
  let max: number;
  if (contentSize >= safeSize) {
    // World is larger than the viewport: it must keep covering the safe rect (plus overscroll).
    max = safeStart + margin - contentStartAtZeroPan;
    min = safeStart + safeSize - margin - contentSize - contentStartAtZeroPan;
  } else {
    // World is smaller: it may move inside the safe rect but must stay within it (plus overscroll).
    min = safeStart - margin - contentStartAtZeroPan;
    max = safeStart + safeSize + margin - contentSize - contentStartAtZeroPan;
  }
  if (min > max) { const mid = (min + max) / 2; min = mid; max = mid; }
  return { value: clamp(value, min, max), min, max };
}

export interface CameraInput {
  /** Full world-space rect of everything that exists (never cropped away). */
  worldBounds: ScreenRect;
  /** World-space point shown in the middle of the safe rect when pan is zero. */
  focus: ScreenPoint;
  viewport: Viewport;
  /** Explicit zoom; defaults to config.defaultZoom. */
  zoom?: number;
  /** Raw drag offset in screen px; clamped internally. */
  pan?: ScreenPoint;
  config?: CameraConfig;
}

/**
 * Build a play camera at a fixed zoom around `focus`, with the drag offset clamped so every part
 * of the world stays reachable and none of it can be thrown off screen.
 */
export function createCamera(input: CameraInput): Camera {
  const config = input.config ?? DEFAULT_CAMERA_CONFIG;
  const safeRect = safeRectOf(input.viewport);
  const requested = input.zoom ?? config.defaultZoom;
  const zoom = clamp(requested, config.minZoom, config.maxZoom);
  const pan = input.pan ?? { x: 0, y: 0 };

  const baseX = safeRect.x + safeRect.width / 2 - input.focus.x * zoom;
  const baseY = safeRect.y + safeRect.height / 2 - input.focus.y * zoom;

  const x = clampAxis(
    input.worldBounds.x * zoom + baseX, input.worldBounds.width * zoom,
    safeRect.x, safeRect.width, config.panMargin, pan.x,
  );
  const y = clampAxis(
    input.worldBounds.y * zoom + baseY, input.worldBounds.height * zoom,
    safeRect.y, safeRect.height, config.panMargin, pan.y,
  );

  return {
    zoom,
    offsetX: baseX + x.value,
    offsetY: baseY + y.value,
    safeRect,
    worldBounds: input.worldBounds,
    clamped: requested !== zoom,
    pan: { x: x.value, y: y.value },
    panBounds: { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max },
  };
}

/** Clamp a raw drag offset against a camera that was already built. */
export function clampPanTo(camera: Camera, pan: ScreenPoint): ScreenPoint {
  return {
    x: clamp(pan.x, camera.panBounds.minX, camera.panBounds.maxX),
    y: clamp(pan.y, camera.panBounds.minY, camera.panBounds.maxY),
  };
}

/** Can this tile be brought into the safe area by dragging? */
export function isTileReachable(p: GridPos, cam: Camera, proj: IsoProjection = PROTOTYPE_PROJECTION): boolean {
  const world = gridToScreen(p, proj);
  const screenAtZeroPan = {
    x: world.x * cam.zoom + cam.offsetX - cam.pan.x,
    y: world.y * cam.zoom + cam.offsetY - cam.pan.y,
  };
  const r = cam.safeRect;
  const xOk = screenAtZeroPan.x + cam.panBounds.maxX >= r.x && screenAtZeroPan.x + cam.panBounds.minX <= r.x + r.width;
  const yOk = screenAtZeroPan.y + cam.panBounds.maxY >= r.y && screenAtZeroPan.y + cam.panBounds.minY <= r.y + r.height;
  return xOk && yOk;
}
