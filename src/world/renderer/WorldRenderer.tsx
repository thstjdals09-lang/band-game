// Renderer registry. Swap ACTIVE_RENDERER when the Phaser isometric renderer lands - it must
// implement WorldViewProps and honour scene.nodes order.
import type { ComponentType } from 'react';
import { DebugIsoWorldView } from './DebugIsoWorldView';
import type { WorldViewProps } from './types';

export const rendererRegistry: Record<string, ComponentType<WorldViewProps>> = {
  debugIso: DebugIsoWorldView,
  // phaser: PhaserIsoWorldView,  // WORLD FOUNDATION 2+
};

export const ACTIVE_RENDERER = 'debugIso';

export function WorldRenderer(props: WorldViewProps) {
  const View = rendererRegistry[ACTIVE_RENDERER] ?? DebugIsoWorldView;
  return <View {...props} />;
}
