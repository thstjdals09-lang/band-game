// BASECAMP STAGE 2 - the recording room is built.
//
// Expressed as a PATCH on Stage 1, not as a second background image: new floor tiles, one new
// prop, one new spawn point and a wider camera bound. The recording room DOOR object is the same
// instance in both stages; only its STATE changes (see objects/instances.ts).

import { BASECAMP_STAGE_1 } from './basecampStage1';
import { applyMapPatch, type FloorTile, type MapPatch } from './types';

const BOOTH_X0 = 9;
const BOOTH_X1 = 11;
const BOOTH_Y0 = 1;
const BOOTH_Y1 = 4;

function boothFloor(): FloorTile[] {
  const out: FloorTile[] = [];
  for (let y = BOOTH_Y0; y <= BOOTH_Y1; y += 1) {
    for (let x = BOOTH_X0; x <= BOOTH_X1; x += 1) {
      out.push({ pos: { x, y }, material: 'BOOTH', zone: 'RECORDING' });
    }
  }
  return out;
}

export const BASECAMP_STAGE_2_PATCH: MapPatch = {
  id: 'BASECAMP_STAGE_2',
  stage: 2,
  label: '연습실 + 녹음실',
  addFloorTiles: boothFloor(),
  addObjects: [
    { instanceId: 'RECORDING_DESK', defId: 'RECORDING_DESK', anchor: { x: 10, y: 1 } },
  ],
  addSpawnPoints: [
    { id: 'RECORDING_IDLE', kind: 'IDLE', pos: { x: 10, y: 3 }, label: '녹음실' },
  ],
  cameraBounds: { x: 0, y: 0, w: 13, h: 8 },
};

export const BASECAMP_STAGE_2 = applyMapPatch(BASECAMP_STAGE_1, BASECAMP_STAGE_2_PATCH);
