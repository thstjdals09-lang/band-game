// SaveData -> WorldScene. This is a selector: the scene is derived, never stored (Character Master §14).
import { CHARACTERS, type SlotId } from '@/data/master';
import { characterAssetKey } from '@/assets/registry';
import { basecampStage, facilityAvailability, unreadOpportunityCount } from '@/state/selectors';
import type { SaveData } from '@/state/save/schema';
import type { WorldActor, WorldHotspot, WorldMode, WorldScene } from './types';

// PROTOTYPE VARIABLE: normalized positions approximating the Basecamp Hero layout
// (drums center-back, guitar left, bass right, vocal mic front-left, keys right, lounge front).
const SLOT_POS: Record<SlotId, { x: number; y: number }> = {
  DRUMS: { x: 0.50, y: 0.40 },
  GUITAR: { x: 0.24, y: 0.52 },
  BASS: { x: 0.70, y: 0.50 },
  VOCAL: { x: 0.40, y: 0.62 },
  KEYS: { x: 0.80, y: 0.42 },
};
// Fallback spots for extra / duplicate slots (variable slot architecture).
const EXTRA_POS = [{ x: 0.60, y: 0.64 }, { x: 0.32, y: 0.40 }, { x: 0.76, y: 0.62 }];
const LOUNGE_POS = [{ x: 0.28, y: 0.80 }, { x: 0.46, y: 0.82 }, { x: 0.16, y: 0.84 }];

export function buildBasecampScene(save: SaveData, mode: WorldMode = 'home'): WorldScene {
  const stage = basecampStage(save);
  const actors: WorldActor[] = [];
  const placed = new Set<string>();
  const usedSlotIds = new Set<SlotId>();
  let extra = 0;

  save.band.lineup.forEach((s) => {
    const a = s.assignment;
    if (!a) return;
    const pos = usedSlotIds.has(s.slotId) ? EXTRA_POS[(extra++) % EXTRA_POS.length] : SLOT_POS[s.slotId];
    usedSlotIds.add(s.slotId);
    if (a.kind === 'MEMBER') {
      placed.add(a.characterId);
      actors.push({ id: a.characterId, kind: 'character', label: CHARACTERS[a.characterId].name, assetKey: characterAssetKey(a.characterId, 'FULL'), x: pos.x, y: pos.y, activity: 'practice' });
    } else {
      actors.push({ id: a.instanceId, kind: 'session', label: '세션', assetKey: 'SESSION_MUSICIAN_FULL', x: pos.x, y: pos.y, activity: 'practice' });
    }
  });
  save.band.activeMembers.filter((id) => !placed.has(id)).forEach((id, i) => {
    const pos = LOUNGE_POS[i % LOUNGE_POS.length];
    actors.push({ id, kind: 'character', label: CHARACTERS[id].name, assetKey: characterAssetKey(id, 'FULL'), x: pos.x, y: pos.y, activity: 'rest' });
  });

  const unread = unreadOpportunityCount(save);
  const auditionOpen = Object.values(save.auditions).some((a) => a.status === 'OPEN' && a.candidateIds.length > 0);
  const recording = facilityAvailability(save, 'RECORDING_ROOM');
  const recordingLabel = recording === 'BUILT' ? '사용 가능' : recording === 'AVAILABLE' ? '건설 가능' : '잠김';

  const hotspots: WorldHotspot[] = [
    { id: 'PHONE_DESK', kind: 'inbox', label: '전화', assetKey: 'OBJ_PHONE_DESK', x: 0.82, y: 0.78, target: '/inbox', badge: unread > 0 ? String(unread) : undefined },
    { id: 'NOTICE_BOARD', kind: 'board', label: '게시판', assetKey: 'OBJ_NOTICE_BOARD', x: 0.15, y: 0.28, target: '/audition', badge: auditionOpen && save.band.activeMembers.length === 0 ? '!' : undefined },
    { id: 'EXIT', kind: 'exit', label: '밖으로', assetKey: 'OBJ_EXIT_DOOR', x: 0.10, y: 0.62, target: '/outside' },
    {
      id: 'RECORDING_ROOM', kind: 'facility', label: '녹음실',
      assetKey: recording === 'BUILT' ? 'OBJ_RECORDING_ROOM_BUILT' : 'OBJ_RECORDING_ROOM_DOOR_LOCKED',
      x: 0.86, y: 0.28, state: recording, stateLabel: recordingLabel,
      target: mode === 'build' && recording === 'AVAILABLE' ? '/management/facilities/build/RECORDING_ROOM' : '/management/facilities',
      badge: recording === 'AVAILABLE' ? '!' : undefined,
    },
  ];
  if (mode === 'build') {
    // Locked expansion silhouettes (IA §22: 잠긴 공간은 실루엣/빈 공간으로 존재)
    hotspots.push({ id: 'NEXT_SPACE', kind: 'facility', label: '옆 공간', assetKey: 'OBJ_NEXT_SPACE', x: 0.13, y: 0.14, state: 'LOCKED', stateLabel: '잠김', target: '/management/facilities' });
    hotspots.push({ id: 'UPSTAIRS', kind: 'facility', label: '위층', assetKey: 'OBJ_UPSTAIRS', x: 0.58, y: 0.13, state: 'LOCKED', stateLabel: '잠김', target: '/management/facilities' });
  }

  return { mode, stage, backgroundKey: stage >= 2 ? 'BASECAMP_BG_STAGE2' : 'BASECAMP_BG_STAGE1', actors, hotspots };
}
