// Runtime world objects: map placement (master) + object state (SaveData) + interaction target.
// No new gameplay here - object state is read from the existing selectors and interactions reuse
// the existing routes.

import { CHARACTERS, type CharacterId } from '@/data/master';
import { facilityAvailability, unreadOpportunityCount, type FacilityAvailability } from '@/state/selectors';
import type { SaveData } from '@/state/save/schema';
import { footprintTiles, type GridPos } from '../iso/coordinates';
import { hitTilesFor } from '../iso/hitTest';
import type { OccupantPlacement } from '../iso/occupancy';
import { assetKeyForState, depthAnchorFor, interactionTileFor, OBJECT_DEFINITIONS, type ObjectDefId, type ObjectDefinition } from './definitions';
import { spawnById, spawnForSlot, type BasecampMap, type SpawnPoint } from '../maps/types';
import { sessionAssetKey } from '@/assets/registry';

export type WorldMode = 'home' | 'build';

export interface WorldObjectInstance {
  instanceId: string;
  defId: ObjectDefId;
  def: ObjectDefinition;
  anchor: GridPos;
  depthAnchor: GridPos;
  interactionTile?: GridPos;
  occupiedTiles: GridPos[];
  hitTiles: GridPos[];
  state: string;
  stateLabel?: string;
  assetKey: string;
  badge?: string;
  /** Existing route reused for this interaction; undefined = not interactive yet. */
  target?: string;
  label: string;
}

const FACILITY_STATE: Record<FacilityAvailability, string> = {
  BUILT: 'built',
  AVAILABLE: 'buildable',
  LOCKED: 'locked',
};
const FACILITY_LABEL: Record<FacilityAvailability, string> = {
  BUILT: '사용 가능',
  AVAILABLE: '건설 가능',
  LOCKED: '잠김',
};

/** Object state + interaction target derived from SaveData. */
function resolveState(defId: ObjectDefId, save: SaveData, mode: WorldMode): Pick<WorldObjectInstance, 'state' | 'stateLabel' | 'badge' | 'target'> {
  switch (defId) {
    case 'PHONE_DESK': {
      const unread = unreadOpportunityCount(save);
      return { state: unread > 0 ? 'notification' : 'idle', badge: unread > 0 ? String(unread) : undefined, target: '/inbox' };
    }
    case 'NOTICE_BOARD': {
      const open = Object.values(save.auditions).some((a) => a.status === 'OPEN' && a.candidateIds.length > 0);
      const highlight = open && save.band.activeMembers.length === 0;
      return { state: open ? 'audition_available' : 'idle', badge: highlight ? '!' : undefined, target: '/audition' };
    }
    case 'EXIT_DOOR':
      return { state: 'idle', target: '/outside' };
    case 'RECORDING_ROOM_ENTRANCE': {
      const av = facilityAvailability(save, 'RECORDING_ROOM');
      const target = mode === 'build' && av === 'AVAILABLE'
        ? '/management/facilities/build/RECORDING_ROOM'
        : '/management/facilities';
      return { state: FACILITY_STATE[av], stateLabel: FACILITY_LABEL[av], badge: av === 'AVAILABLE' ? '!' : undefined, target };
    }
    default:
      return { state: OBJECT_DEFINITIONS[defId].defaultState };
  }
}

export function resolveObjectInstances(map: BasecampMap, save: SaveData, mode: WorldMode): WorldObjectInstance[] {
  return map.objects.map((placement) => {
    const def = OBJECT_DEFINITIONS[placement.defId];
    const runtime = resolveState(placement.defId, save, mode);
    const interactionTile = interactionTileFor(placement.defId, placement.anchor);
    return {
      instanceId: placement.instanceId,
      defId: placement.defId,
      def,
      anchor: placement.anchor,
      depthAnchor: depthAnchorFor(placement.defId, placement.anchor),
      interactionTile,
      occupiedTiles: def.blocking ? footprintTiles(placement.anchor, def.footprint) : [],
      hitTiles: hitTilesFor(placement.anchor, def.footprint, interactionTile),
      assetKey: assetKeyForState(placement.defId, runtime.state),
      label: def.label,
      ...runtime,
    };
  });
}

export function occupancyPlacements(instances: WorldObjectInstance[]): OccupantPlacement[] {
  return instances.map((i) => ({
    id: i.instanceId,
    anchor: i.anchor,
    footprint: i.def.footprint,
    blocking: i.def.blocking && !i.def.wallMounted,
  }));
}

// ---------------------------------------------------------------- characters
export interface WorldCharacterPlacement {
  id: string;
  kind: 'member' | 'session';
  characterId?: CharacterId;
  label: string;
  pos: GridPos;
  spawnId: string;
  pose: 'play' | 'idle' | 'sit';
  assetKey: string;
}

/**
 * Lineup / roster -> spawn points. Characters use world coordinates, never screen percentages.
 * Movement and pathfinding are out of scope: this only places them on their idle spawn.
 */
export function resolveCharacterPlacements(map: BasecampMap, save: SaveData): WorldCharacterPlacement[] {
  const out: WorldCharacterPlacement[] = [];
  const taken = new Set<string>();
  const placedMembers = new Set<CharacterId>();

  const take = (spawn: SpawnPoint | undefined): SpawnPoint | undefined => {
    if (!spawn || taken.has(spawn.id)) return undefined;
    taken.add(spawn.id);
    return spawn;
  };

  save.band.lineup.forEach((slot) => {
    const a = slot.assignment;
    if (!a) return;
    const spawn = take(spawnForSlot(map, slot.slotId));
    if (!spawn) return;
    if (a.kind === 'MEMBER') {
      placedMembers.add(a.characterId);
      out.push({
        id: a.characterId, kind: 'member', characterId: a.characterId, label: CHARACTERS[a.characterId].name,
        pos: spawn.pos, spawnId: spawn.id, pose: 'play', assetKey: `CHARACTER_${a.characterId}_FULL`,
      });
    } else {
      out.push({
        // 세션도 사람으로 보여야 한다. 같은 세션은 항상 같은 얼굴이다(저장하지 않는다).
        id: a.instanceId, kind: 'session', label: '세션',
        pos: spawn.pos, spawnId: spawn.id, pose: 'play', assetKey: sessionAssetKey(a.instanceId, 'FULL'),
      });
    }
  });

  const idleOrder = ['SOFA_IDLE', 'FREE_IDLE_01', 'FREE_IDLE_02', 'DESK_IDLE', 'RECORDING_IDLE'];
  save.band.activeMembers.filter((id) => !placedMembers.has(id)).forEach((id, i) => {
    const spawn = take(spawnById(map, idleOrder[i % idleOrder.length])) ?? take(spawnById(map, 'FREE_IDLE_02'));
    if (!spawn) return;
    out.push({
      id, kind: 'member', characterId: id, label: CHARACTERS[id].name,
      pos: spawn.pos, spawnId: spawn.id, pose: spawn.kind === 'SOFA' ? 'sit' : 'idle',
      assetKey: `CHARACTER_${id}_FULL`,
    });
  });

  return out;
}
