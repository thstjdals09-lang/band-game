// BASECAMP STAGE 1 - the small basement practice room.
//
// PROTOTYPE LAYOUT: tile coordinates below are provisional and will be re-authored once the
// approved isometric room art exists. They are NOT a final art position. What IS fixed by this
// file is the shape of the data: every object lives at a grid coordinate with a footprint.

import type { BasecampMap, FloorTile, WallTile } from './types';

const FLOOR_X0 = 1;
const FLOOR_X1 = 8;
const FLOOR_Y0 = 1;
const FLOOR_Y1 = 7;

const RUG_TILES = new Set(['3,3', '4,3', '5,3', '3,4', '4,4', '5,4']);

function buildFloor(): FloorTile[] {
  const out: FloorTile[] = [];
  for (let y = FLOOR_Y0; y <= FLOOR_Y1; y += 1) {
    for (let x = FLOOR_X0; x <= FLOOR_X1; x += 1) {
      const rug = RUG_TILES.has(`${x},${y}`);
      out.push({ pos: { x, y }, material: rug ? 'RUG' : 'CONCRETE', zone: rug ? 'PRACTICE' : undefined });
    }
  }
  return out;
}

function buildWalls(): WallTile[] {
  const out: WallTile[] = [];
  // North wall runs the full map width so the Stage 2 room shares it.
  for (let x = 0; x <= 12; x += 1) out.push({ pos: { x, y: 0 }, side: 'NORTH', heightUnits: 2.4 });
  // West wall.
  for (let y = 1; y <= FLOOR_Y1; y += 1) out.push({ pos: { x: 0, y }, side: 'WEST', heightUnits: 2.4 });
  return out;
}

export const BASECAMP_STAGE_1: BasecampMap = {
  id: 'BASECAMP_STAGE_1',
  stage: 1,
  label: '지하 연습실',
  width: 13,
  height: 8,
  floorTiles: buildFloor(),
  wallTiles: buildWalls(),
  objects: [
    // Wall-mounted: no floor occupancy.
    { instanceId: 'NOTICE_BOARD', defId: 'NOTICE_BOARD', anchor: { x: 3, y: 0 } },
    { instanceId: 'EXIT_DOOR', defId: 'EXIT_DOOR', anchor: { x: 0, y: 4 } },
    { instanceId: 'RECORDING_ROOM_ENTRANCE', defId: 'RECORDING_ROOM_ENTRANCE', anchor: { x: 9, y: 2 } },
    // Floor props.
    { instanceId: 'PRACTICE_ZONE', defId: 'PRACTICE_ZONE', anchor: { x: 2, y: 2 } },
    { instanceId: 'DRUM_ZONE', defId: 'DRUM_ZONE', anchor: { x: 4, y: 1 } },
    { instanceId: 'AMP_ZONE', defId: 'AMP_ZONE', anchor: { x: 1, y: 1 } },
    { instanceId: 'SOFA', defId: 'SOFA', anchor: { x: 2, y: 6 } },
    { instanceId: 'PHONE_DESK', defId: 'PHONE_DESK', anchor: { x: 7, y: 6 } },
  ],
  spawnPoints: [
    { id: 'PERFORM_VOCAL', kind: 'PERFORM', slotId: 'VOCAL', pos: { x: 3, y: 4 }, label: '보컬 자리' },
    { id: 'PERFORM_GUITAR', kind: 'PERFORM', slotId: 'GUITAR', pos: { x: 2, y: 3 }, label: '기타 자리' },
    { id: 'PERFORM_BASS', kind: 'PERFORM', slotId: 'BASS', pos: { x: 6, y: 3 }, label: '베이스 자리' },
    { id: 'PERFORM_DRUMS', kind: 'PERFORM', slotId: 'DRUMS', pos: { x: 5, y: 3 }, label: '드럼 자리' },
    { id: 'PERFORM_KEYS', kind: 'PERFORM', slotId: 'KEYS', pos: { x: 6, y: 1 }, label: '키보드 자리' },
    { id: 'SOFA_IDLE', kind: 'SOFA', pos: { x: 3, y: 7 }, label: '소파' },
    { id: 'DESK_IDLE', kind: 'DESK', pos: { x: 7, y: 5 }, label: '책상 앞' },
    { id: 'FREE_IDLE_01', kind: 'IDLE', pos: { x: 5, y: 6 }, label: '빈자리 1' },
    { id: 'FREE_IDLE_02', kind: 'IDLE', pos: { x: 6, y: 7 }, label: '빈자리 2' },
  ],
  cameraBounds: { x: 0, y: 0, w: 10, h: 8 },
};
