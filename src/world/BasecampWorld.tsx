// React wrapper: measures its container, builds the scene from SaveData, renders it and maps
// world taps onto the existing routes. No map data or projection maths lives in here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSave } from '@/state/store';
import { useDevStore } from '@/state/devStore';
import { NO_INSETS, readChromeInsets, type ViewportInsets } from './iso/camera';
import { buildWorldScene } from './renderer/buildScene';
import { WorldRenderer } from './renderer/WorldRenderer';
import { NO_DEBUG, type RenderNode, type WorldDebugFlags } from './renderer/types';
import type { WorldMode } from './objects/instances';

interface Props {
  mode?: WorldMode;
  interactive?: boolean;
  /** Override the basecamp stage (dev lab only). */
  stageOverride?: number;
  /** Override chrome insets; defaults to HUD + Dock for the full-screen HOME world. */
  insets?: ViewportInsets;
  debug?: WorldDebugFlags;
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

export function BasecampWorld({ mode = 'home', interactive = true, stageOverride, insets, debug }: Props) {
  const save = useSave();
  const navigate = useNavigate();
  const devFlags = useDevStore((s) => s.world);
  const testSprite = useDevStore((s) => s.testSprite);
  const diagnostics = useDevStore((s) => s.diagnostics);
  const { ref, size } = useElementSize<HTMLDivElement>();

  const resolvedInsets = useMemo<ViewportInsets>(
    () => insets ?? (mode === 'home' ? readChromeInsets() : NO_INSETS),
    [insets, mode],
  );

  const scene = useMemo(() => buildWorldScene({
    save,
    mode,
    stageOverride,
    testSprite,
    viewport: { width: size.width, height: size.height, insets: resolvedInsets },
  }), [save, mode, stageOverride, testSprite, size.width, size.height, resolvedInsets]);

  const activeDebug = debug ?? (diagnostics ? devFlags : NO_DEBUG);

  const onSelect = (node: RenderNode) => {
    if (!interactive || !node.target) return;
    navigate(node.target);
  };

  return (
    <div className="world" ref={ref} data-stage={scene.stage} data-mode={scene.mode}>
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
