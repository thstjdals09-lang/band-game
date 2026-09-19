// React wrapper: measures its container, builds the scene from SaveData, renders it and maps
// world taps onto the existing routes. No map data or projection maths lives in here.
//
// Camera: the playable world is NOT fitted to the screen. It renders at a readable zoom and the
// player drags freely on both axes to explore what falls outside. Build/preview surfaces still
// frame the whole room.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSave } from '@/state/store';
import { useDevStore } from '@/state/devStore';
import { clampPanTo, NO_INSETS, readChromeInsets, type Camera, type ViewportInsets } from './iso/camera';
import type { ScreenPoint } from './iso/projection';
import { buildWorldScene } from './renderer/buildScene';
import { WorldRenderer } from './renderer/WorldRenderer';
import { NO_DEBUG, type CameraMode, type RenderNode, type WorldDebugFlags } from './renderer/types';
import type { WorldMode } from './objects/instances';

/** A pointer that moves further than this is a camera drag, not a tap on an object. */
const DRAG_THRESHOLD_PX = 6;

interface Props {
  mode?: WorldMode;
  interactive?: boolean;
  /** Override the basecamp stage (dev lab only). */
  stageOverride?: number;
  /** Override chrome insets; defaults to HUD + Dock for the full-screen HOME world. */
  insets?: ViewportInsets;
  debug?: WorldDebugFlags;
  /** Override the camera mode (dev lab). Defaults to fit for build surfaces, play otherwise. */
  cameraMode?: CameraMode;
  /** Play-camera zoom override (dev lab). */
  zoom?: number;
  /** Allow drag-to-explore. Off for scaled previews where pointer deltas would not match. */
  pannable?: boolean;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

export function BasecampWorld({
  mode = 'home', interactive = true, stageOverride, insets, debug, cameraMode, zoom, pannable,
}: Props) {
  const save = useSave();
  const navigate = useNavigate();
  const devFlags = useDevStore((s) => s.world);
  const testSprite = useDevStore((s) => s.testSprite);
  const devPlayZoom = useDevStore((s) => s.playZoom);
  const diagnostics = useDevStore((s) => s.diagnostics);
  const { ref, size } = useElementSize<HTMLDivElement>();

  const [pan, setPan] = useState<ScreenPoint>({ x: 0, y: 0 });
  const cameraRef = useRef<Camera | null>(null);
  const dragRef = useRef<{ id: number; sx: number; sy: number; startPan: ScreenPoint; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const resolvedInsets = useMemo<ViewportInsets>(
    () => insets ?? (mode === 'home' ? readChromeInsets() : NO_INSETS),
    [insets, mode],
  );

  const scene = useMemo(() => buildWorldScene({
    save,
    mode,
    stageOverride,
    testSprite,
    cameraMode,
    zoom: zoom ?? devPlayZoom,
    pan,
    viewport: { width: size.width, height: size.height, insets: resolvedInsets },
  }), [save, mode, stageOverride, testSprite, cameraMode, zoom, devPlayZoom, pan, size.width, size.height, resolvedInsets]);

  cameraRef.current = scene.camera;

  // A new map means a new world to look at: start from its focus point again.
  const mapId = scene.map.id;
  useEffect(() => { setPan({ x: 0, y: 0 }); }, [mapId]);

  const canPan = (pannable ?? true) && scene.cameraMode === 'play';

  // NOTE: pointer capture is taken only once the gesture is confirmed as a drag. Capturing on
  // pointerdown would retarget the following click to this element and swallow every object tap.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPan || e.button !== 0) return;
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, startPan: pan, moved: false };
  }, [canPan, pan]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setDragging(true);
      const el = e.currentTarget as HTMLElement;
      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
    }
    if (!drag.moved) return;
    const cam = cameraRef.current;
    const next = { x: drag.startPan.x + dx, y: drag.startPan.y + dy };
    setPan(cam ? clampPanTo(cam, next) : next);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    // Swallow the click that follows a drag so panning never triggers navigation.
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setDragging(false);
    if (drag.moved) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  }, []);

  const activeDebug = debug ?? (diagnostics ? devFlags : NO_DEBUG);

  const onSelect = (node: RenderNode) => {
    if (!interactive || !node.target) return;
    if (suppressClickRef.current) return;
    navigate(node.target);
  };

  return (
    <div
      className={`world ${canPan ? 'world--pannable' : ''} ${dragging ? 'world--dragging' : ''}`}
      ref={ref}
      data-stage={scene.stage}
      data-mode={scene.mode}
      data-camera={scene.cameraMode}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {size.width > 0 && size.height > 0 && (
        <WorldRenderer
          scene={scene}
          debug={activeDebug}
          onSelectObject={interactive ? onSelect : undefined}
          onSelectCharacter={interactive ? onSelect : undefined}
        />
      )}
    </div>
  );
}
