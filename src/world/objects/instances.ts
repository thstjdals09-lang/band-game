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
import { hasFloorAt, type BasecampMap } from '../maps/types';
import { characterPoseAssetKey, sessionAssetKey } from '@/assets/registry';

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
 * 맵에 서는 사람은 **라인업에 넣은 인물뿐**이다.
 * 보유 멤버가 늘어나도 방이 사람으로 가득 차지 않는다.
 *
 * 기본 자리는 스폰 목록 순서대로 하나씩 가져간다. 어느 타일이 무슨 악기 자리인지는 쓰지 않는다.
 * 플레이어가 직접 놓은 자리가 있으면 언제나 그것이 이긴다.
 */
export function resolveCharacterPlacements(map: BasecampMap, save: SaveData): WorldCharacterPlacement[] {
  const out: WorldCharacterPlacement[] = [];
  const chosen = save.worldPlacements ?? {};

  // 기본 자리: 의미 없는 순서 목록. 플레이어가 옮기기 전까지 서 있을 곳이면 된다.
  const spots = map.spawnPoints.map((sp) => sp.pos).filter((pos) => hasFloorAt(map, pos));
  let nextSpot = 0;
  const takeSpot = (): GridPos => spots[Math.min(nextSpot++, spots.length - 1)] ?? { x: 1, y: 1 };

  /**
   * 플레이어가 직접 놓은 자리가 있으면 그것이 이긴다. 라인업이 바뀌어도 움직이지 않는다.
   * 남아 있는 좌표가 바닥이 아니면(맵이 바뀐 경우) 기본 자리로 돌아간다.
   */
  const applyChoice = (p: WorldCharacterPlacement): WorldCharacterPlacement => {
    const pick = chosen[p.id];
    if (!pick) return p;
    const movable = pick.pos && hasFloorAt(map, pick.pos);
    const assetKey = p.characterId ? characterPoseAssetKey(p.characterId, pick.pose) : p.assetKey;
    return movable
      ? { ...p, pos: pick.pos!, spawnId: 'PLAYER_PLACED', assetKey }
      : { ...p, assetKey };
  };

  save.band.lineup.forEach((slot) => {
    const a = slot.assignment;
    if (!a) return;
    const pos = takeSpot();
    if (a.kind === 'MEMBER') {
      out.push(applyChoice({
        id: a.characterId, kind: 'member', characterId: a.characterId, label: CHARACTERS[a.characterId].name,
        pos, spawnId: 'DEFAULT', pose: 'play', assetKey: `CHARACTER_${a.characterId}_FULL`,
      }));
    } else {
      out.push(applyChoice({
        // 세션도 사람으로 보여야 한다. 같은 세션은 항상 같은 얼굴이다(저장하지 않는다).
        id: a.instanceId, kind: 'session', label: '세션',
        pos, spawnId: 'DEFAULT', pose: 'play', assetKey: sessionAssetKey(a.instanceId, 'FULL'),
      }));
    }
  });

  return out;
}
