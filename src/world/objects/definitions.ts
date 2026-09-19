// World object master data. Footprint / anchor / depth anchor / interaction tile / state variants.
// Object STATE comes from SaveData at runtime (see objects/instances.ts) - nothing here is mutable.

import { ensureAssetKeys } from '@/assets/registry';
import { FLOOR_ANCHOR, type ObjectAssetDefinition, type ObjectStateVariant } from '../assets/contract';
import type { Footprint, GridPos } from '../iso/coordinates';

export type ObjectDefId =
  | 'NOTICE_BOARD' | 'PHONE_DESK' | 'EXIT_DOOR' | 'RECORDING_ROOM_ENTRANCE'
  | 'PRACTICE_ZONE' | 'SOFA' | 'DRUM_ZONE' | 'AMP_ZONE' | 'RECORDING_DESK';

export type ObjectKind = 'interactive' | 'facility' | 'prop' | 'zone';

export interface ObjectDefinition extends ObjectAssetDefinition {
  id: ObjectDefId;
  label: string;
  kind: ObjectKind;
  /** Wall-mounted props hang on a wall tile and reserve no floor. */
  wallMounted: boolean;
  /** Zones mark the floor without reserving it. */
  blocking: boolean;
  defaultState: string;
}

const variants = (id: ObjectDefId, states: string[]): ObjectStateVariant[] =>
  states.map((s) => ({ id: s, assetKey: `OBJ_${id}_${s.toUpperCase()}` }));

const def = (d: ObjectDefinition): ObjectDefinition => d;

export const OBJECT_DEFINITIONS: Record<ObjectDefId, ObjectDefinition> = {
  NOTICE_BOARD: def({
    id: 'NOTICE_BOARD', label: '게시판', kind: 'interactive', wallMounted: true, blocking: false,
    footprint: { w: 2, h: 1 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: { ax: 0.5, ay: 1 },
    interactionOffset: { x: 0, y: 1 }, heightUnits: 1.2,
    stateVariants: variants('NOTICE_BOARD', ['idle', 'audition_available']), defaultState: 'idle',
  }),
  PHONE_DESK: def({
    id: 'PHONE_DESK', label: '전화 · 책상', kind: 'interactive', wallMounted: false, blocking: true,
    footprint: { w: 2, h: 1 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    interactionOffset: { x: 0, y: -1 }, heightUnits: 0.9,
    stateVariants: variants('PHONE_DESK', ['idle', 'notification']), defaultState: 'idle',
  }),
  EXIT_DOOR: def({
    id: 'EXIT_DOOR', label: '밖으로', kind: 'interactive', wallMounted: true, blocking: false,
    footprint: { w: 1, h: 2 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: { ax: 0.5, ay: 1 },
    interactionOffset: { x: 1, y: 0 }, heightUnits: 1.8,
    stateVariants: variants('EXIT_DOOR', ['idle']), defaultState: 'idle',
  }),
  RECORDING_ROOM_ENTRANCE: def({
    id: 'RECORDING_ROOM_ENTRANCE', label: '녹음실', kind: 'facility', wallMounted: true, blocking: false,
    footprint: { w: 1, h: 2 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: { ax: 0.5, ay: 1 },
    interactionOffset: { x: -1, y: 0 }, heightUnits: 1.8,
    stateVariants: variants('RECORDING_ROOM_ENTRANCE', ['locked', 'buildable', 'built']), defaultState: 'locked',
  }),
  PRACTICE_ZONE: def({
    id: 'PRACTICE_ZONE', label: '합주 구역', kind: 'zone', wallMounted: false, blocking: false,
    footprint: { w: 4, h: 3 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    heightUnits: 0, stateVariants: variants('PRACTICE_ZONE', ['idle']), defaultState: 'idle',
  }),
  SOFA: def({
    id: 'SOFA', label: '소파', kind: 'prop', wallMounted: false, blocking: true,
    footprint: { w: 2, h: 1 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    heightUnits: 0.8, stateVariants: variants('SOFA', ['idle']), defaultState: 'idle',
  }),
  DRUM_ZONE: def({
    id: 'DRUM_ZONE', label: '드럼', kind: 'prop', wallMounted: false, blocking: true,
    footprint: { w: 2, h: 2 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    heightUnits: 1.2, stateVariants: variants('DRUM_ZONE', ['idle']), defaultState: 'idle',
  }),
  AMP_ZONE: def({
    id: 'AMP_ZONE', label: '앰프', kind: 'prop', wallMounted: false, blocking: true,
    footprint: { w: 2, h: 1 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    heightUnits: 1, stateVariants: variants('AMP_ZONE', ['idle']), defaultState: 'idle',
  }),
  RECORDING_DESK: def({
    id: 'RECORDING_DESK', label: '녹음 콘솔', kind: 'prop', wallMounted: false, blocking: true,
    footprint: { w: 2, h: 1 }, anchorOffset: { x: 0, y: 0 }, spriteAnchor: FLOOR_ANCHOR,
    heightUnits: 0.9, stateVariants: variants('RECORDING_DESK', ['idle']), defaultState: 'idle',
  }),
};

export const OBJECT_DEF_IDS = Object.keys(OBJECT_DEFINITIONS) as ObjectDefId[];

/** Depth anchor tile for a placement (front tile of the footprint unless overridden). */
export function depthAnchorFor(defId: ObjectDefId, anchor: GridPos): GridPos {
  const d = OBJECT_DEFINITIONS[defId];
  if (d.depthAnchorOffset) {
    return { x: anchor.x + d.depthAnchorOffset.x, y: anchor.y + d.depthAnchorOffset.y, z: anchor.z ?? 0 };
  }
  return { x: anchor.x + d.footprint.w - 1, y: anchor.y + d.footprint.h - 1, z: anchor.z ?? 0 };
}

export function interactionTileFor(defId: ObjectDefId, anchor: GridPos): GridPos | undefined {
  const d = OBJECT_DEFINITIONS[defId];
  if (!d.interactionOffset) return undefined;
  return { x: anchor.x + d.interactionOffset.x, y: anchor.y + d.interactionOffset.y, z: anchor.z ?? 0 };
}

export function footprintOf(defId: ObjectDefId): Footprint {
  return OBJECT_DEFINITIONS[defId].footprint;
}

export function assetKeyForState(defId: ObjectDefId, stateId: string): string {
  const d = OBJECT_DEFINITIONS[defId];
  const v = d.stateVariants.find((s) => s.id === stateId) ?? d.stateVariants[0];
  return v.assetKey;
}

// Register every state variant in the asset registry so production art can be dropped in later.
ensureAssetKeys(OBJECT_DEF_IDS.flatMap((id) => OBJECT_DEFINITIONS[id].stateVariants.map((v) => v.assetKey)));
ensureAssetKeys(['TILE_FLOOR_CONCRETE', 'TILE_FLOOR_RUG', 'TILE_FLOOR_BOOTH', 'TILE_WALL_CONCRETE']);
