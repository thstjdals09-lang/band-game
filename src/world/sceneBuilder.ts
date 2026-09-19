// SaveData -> WorldScene. This is a selector: the scene is derived, never stored (Character Master §14).
import { CHARACTERS, FACILITIES, type SlotId } from '@/data/master';
import { characterAssetKey } from '@/assets/registry';
import { basecampStage, facilityAvailability, unreadOpportunityCount } from '@/state/selectors';
import type { SaveData } from '@/state/save/schema';
import type { WorldActor, WorldHotspot, WorldMode, WorldScene } from './types';

// PROTOTYPE VARIABLE: normalized positions approximating Visual Bible Hero 01 layout
// (drums center-back, guitar left, bass right, vocal mic front-left, keys right, sofa lounge front, desk/laptop front-right).
const SLOT_POS: Record<SlotId, { x: number; y: number }> = {
  DRUMS: { x: 0.50, y: 0.40 },
  GUITAR: { x: 0.26, y: 0.52 },
  BASS: { x: 0.68, y: 0.50 },
  VOCAL: { x: 0.40, y: 0.60 },
  KEYS: { x: 0.80, y: 0.42 },
};
const LOUNGE_POS = [{ x: 0.30, y: 0.80 }, { x: 0.42, y: 0.84 }, { x: 0.20, y: 0.86 }];

export function buildBasecampScene(save: SaveData, mode: WorldMode = 'home'): WorldScene {
  const stage = basecampStage(save);
  const actors: WorldActor[] = [];
  const placed = new Set<string>();

  (Object.keys(save.band.lineup) as SlotId[]).forEach((slot) => {
    const a = save.band.lineup[slot];
    if (!a) return;
    const pos = SLOT_POS[slot];
    if (a.kind === 'MEMBER') {
      placed.add(a.characterId);
      actors.push({ id: a.characterId, kind: 'character', label: CHARACTERS[a.characterId].name, assetKey: characterAssetKey(a.characterId, 'FULL'), x: pos.x, y: pos.y, activity: 'practice' });
    } else {
      actors.push({ id: a.instanceId, kind: 'session', label: 'SESSION', assetKey: 'SESSION_MUSICIAN_FULL', x: pos.x, y: pos.y, activity: 'practice' });
    }
  });
  save.band.activeMembers.filter((id) => !placed.has(id)).forEach((id, i) => {
    const pos = LOUNGE_POS[i % LOUNGE_POS.length];
    actors.push({ id, kind: 'character', label: CHARACTERS[id].name, assetKey: characterAssetKey(id, 'FULL'), x: pos.x, y: pos.y, activity: 'rest' });
  });

  const unread = unreadOpportunityCount(save);
  const auditionOpen = Object.values(save.auditions).some((a) => a.status === 'OPEN' && a.candidateIds.length > 0);
  const recording = facilityAvailability(save, 'RECORDING_ROOM');

  const hotspots: WorldHotspot[] = [
    { id: 'PHONE_DESK', kind: 'inbox', label: 'PHONE / DESK', assetKey: 'OBJ_PHONE_DESK', x: 0.82, y: 0.78, target: '/inbox', badge: unread > 0 ? `${unread} NEW` : undefined },
    { id: 'NOTICE_BOARD', kind: 'board', label: 'BOARD', assetKey: 'OBJ_NOTICE_BOARD', x: 0.16, y: 0.30, target: '/audition', badge: auditionOpen && save.band.activeMembers.length === 0 ? 'AUDITION' : undefined },
    { id: 'EXIT', kind: 'exit', label: 'EXIT', assetKey: 'OBJ_EXIT_DOOR', x: 0.10, y: 0.62, target: '/outside' },
    {
      id: 'RECORDING_ROOM', kind: 'facility', label: FACILITIES.RECORDING_ROOM.name,
      assetKey: recording === 'BUILT' ? 'OBJ_RECORDING_ROOM_BUILT' : 'OBJ_RECORDING_ROOM_DOOR_LOCKED',
      x: 0.86, y: 0.30, state: recording, target: mode === 'build' && recording === 'AVAILABLE' ? '/management/facilities/build/RECORDING_ROOM' : '/management/facilities',
      badge: recording === 'AVAILABLE' ? 'AVAILABLE' : recording === 'LOCKED' ? 'SOON...' : undefined,
    },
  ];
  if (mode === 'build') {
    // Locked expansion silhouettes (IA §22: 잠긴 공간은 실루엣/빈 공간으로 존재)
    hotspots.push({ id: 'NEXT_SPACE', kind: 'facility', label: 'NEXT SPACE', assetKey: 'OBJ_NEXT_SPACE', x: 0.12, y: 0.16, state: 'LOCKED', target: '/management/facilities', badge: 'LOCKED' });
    hotspots.push({ id: 'UPSTAIRS', kind: 'facility', label: 'UPSTAIRS', assetKey: 'OBJ_UPSTAIRS', x: 0.60, y: 0.14, state: 'LOCKED', target: '/management/facilities', badge: 'LOCKED' });
  }

  return { mode, stage, backgroundKey: stage >= 2 ? 'BASECAMP_BG_STAGE2' : 'BASECAMP_BG_STAGE1', actors, hotspots };
}
