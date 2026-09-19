// World view registry. Swap ACTIVE_WORLD_VIEW to a Phaser implementation later (GDD §11 구현 권장 구조:
// React UI와 게임 월드 렌더링을 분리; Phaser/PixiJS 계열 렌더러는 Prototype에서 확정).
import type { ComponentType } from 'react';
import { DomWorldView } from './DomWorldView';
import type { WorldViewProps } from './types';

export const worldViewRegistry: Record<string, ComponentType<WorldViewProps>> = {
  dom: DomWorldView,
  // phaser: PhaserWorldView, // TODO(PHASE3+): isometric tile renderer
};

export const ACTIVE_WORLD_VIEW = 'dom';
export * from './types';
export { buildBasecampScene } from './sceneBuilder';
