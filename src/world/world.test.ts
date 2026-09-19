// WORLD FOUNDATION 1 unit tests: projection, hit test, occupancy, depth, stage mapping,
// spawn coordinates and responsive camera fit across phone viewports.
import { describe, expect, it } from 'vitest';

import {
  DEPTH_BIAS, depthKey, RENDER_PASS, sortByDepth,
  footprintTiles, frontTile,
  gridToScreen, screenToTile, PROTOTYPE_PROJECTION,
  OccupancyGrid, wouldOverlap,
  fitCamera, fitCameraToTiles, safeRectOf, pickTile, pickTargetAtTile, tapRadiusFor,
  MIN_TAP_RADIUS_PX, isTileInSafeArea, boundsForTiles,
} from './iso';
import { BASECAMP_STAGE_1, BASECAMP_STAGE_2, basecampMapForStage, applyMapPatch, spawnForSlot, hasFloorAt } from './maps';
import { BASECAMP_STAGE_2_PATCH } from './maps/basecampStage2';
import { OBJECT_DEFINITIONS, depthAnchorFor, interactionTileFor } from './objects/definitions';
import { occupancyPlacements, resolveCharacterPlacements, resolveObjectInstances } from './objects/instances';
import { buildWorldScene, cameraBoundsOf } from './renderer/buildScene';
import { createNewGame } from '@/state/save/newGame';
import type { SaveData } from '@/state/save/schema';

const proj = PROTOTYPE_PROJECTION;
const insets = { top: 42, bottom: 66, left: 0, right: 0 };
const VIEWPORTS = [
  { label: '320x568', width: 320, height: 568 },
  { label: '375x667', width: 375, height: 667 },
  { label: '390x844', width: 390, height: 844 },
  { label: '393x852', width: 393, height: 852 },
  { label: '430x932', width: 430, height: 932 },
];

function saveWithBand(): SaveData {
  const s = createNewGame('TEST');
  s.band.activeMembers = ['C01', 'C04'];
  s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' }; // VOCAL
  s.band.lineup[1].assignment = { kind: 'MEMBER', characterId: 'C04' }; // GUITAR
  s.band.lineup[2].assignment = { kind: 'SESSION', instanceId: 'session_00001' }; // BASS
  s.sessionHires.session_00001 = {
    instanceId: 'session_00001', templateId: 'SESSION_BASS', slot: 'BASS',
    hiredWeek: 1, endWeek: 5, weeklyCost: 70000,
  };
  return s;
}

// 1 ------------------------------------------------------------------ projection
describe('grid -> screen projection', () => {
  it('places the origin at 0,0 and keeps the 2:1 diamond', () => {
    expect(gridToScreen({ x: 0, y: 0 }, proj)).toEqual({ x: 0, y: 0 });
    expect(gridToScreen({ x: 1, y: 0 }, proj)).toEqual({ x: proj.tileWidth / 2, y: proj.tileHeight / 2 });
    expect(gridToScreen({ x: 0, y: 1 }, proj)).toEqual({ x: -proj.tileWidth / 2, y: proj.tileHeight / 2 });
  });

  it('raises a tile by one elevation unit per z level', () => {
    const flat = gridToScreen({ x: 2, y: 2, z: 0 }, proj);
    const raised = gridToScreen({ x: 2, y: 2, z: 1 }, proj);
    expect(flat.y - raised.y).toBe(proj.elevationHeight);
  });

  it('is independent of render tile size for map authoring', () => {
    const small = gridToScreen({ x: 3, y: 1 }, { tileWidth: 64, tileHeight: 32, elevationHeight: 16 });
    const big = gridToScreen({ x: 3, y: 1 }, proj);
    expect(big.x / small.x).toBeCloseTo(2);
    expect(big.y / small.y).toBeCloseTo(2);
  });
});

// 2 ------------------------------------------------------------------ screen -> grid
describe('screen -> grid hit test', () => {
  it('round-trips every floor tile of stage 1', () => {
    BASECAMP_STAGE_1.floorTiles.forEach((t) => {
      const back = screenToTile(gridToScreen(t.pos, proj), proj);
      expect({ x: back.x, y: back.y }).toEqual({ x: t.pos.x, y: t.pos.y });
    });
  });

  it('round-trips through the camera transform', () => {
    const cam = fitCameraToTiles(BASECAMP_STAGE_1.floorTiles.map((t) => t.pos), { width: 390, height: 844, insets });
    BASECAMP_STAGE_1.floorTiles.forEach((t) => {
      const screen = {
        x: gridToScreen(t.pos, proj).x * cam.zoom + cam.offsetX,
        y: gridToScreen(t.pos, proj).y * cam.zoom + cam.offsetY,
      };
      const back = pickTile(screen, cam, proj);
      expect({ x: back.x, y: back.y }).toEqual({ x: t.pos.x, y: t.pos.y });
    });
  });
});

// 3 ------------------------------------------------------------------ footprint occupancy
describe('footprint occupancy', () => {
  it('reserves exactly the declared tiles', () => {
    const tiles = footprintTiles({ x: 7, y: 6 }, OBJECT_DEFINITIONS.PHONE_DESK.footprint);
    expect(tiles).toEqual([{ x: 7, y: 6, z: 0 }, { x: 8, y: 6, z: 0 }]);
  });

  it('gives wall-mounted props no floor occupancy', () => {
    const instances = resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home');
    const board = instances.find((o) => o.instanceId === 'NOTICE_BOARD')!;
    expect(board.def.wallMounted).toBe(true);
    expect(board.occupiedTiles).toHaveLength(0);
  });

  it('keeps zone markers non-blocking', () => {
    const instances = resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home');
    const zone = instances.find((o) => o.instanceId === 'PRACTICE_ZONE')!;
    expect(zone.def.blocking).toBe(false);
    const grid = new OccupancyGrid(occupancyPlacements(instances));
    expect(grid.isBlocked({ x: 3, y: 3 })).toBe(false);
  });
});

// 4 ------------------------------------------------------------------ overlap detection
describe('overlapping footprint detection', () => {
  it('reports no conflicts in the authored stage 1 and stage 2 maps', () => {
    [BASECAMP_STAGE_1, BASECAMP_STAGE_2].forEach((map) => {
      const grid = new OccupancyGrid(occupancyPlacements(resolveObjectInstances(map, createNewGame('T'), 'home')));
      expect(grid.conflicts()).toEqual([]);
    });
  });

  it('detects a colliding placement', () => {
    const grid = new OccupancyGrid(occupancyPlacements(resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home')));
    // SOFA occupies (2,6)-(3,6)
    expect(wouldOverlap(grid, { id: 'NEW', anchor: { x: 3, y: 6 }, footprint: { w: 2, h: 1 }, blocking: true })).toBe(true);
    expect(wouldOverlap(grid, { id: 'NEW', anchor: { x: 5, y: 7 }, footprint: { w: 2, h: 1 }, blocking: true })).toBe(false);
  });
});

// 5 ------------------------------------------------------------------ depth sorting
describe('depth sorting', () => {
  it('sorts by x+y so a nearer tile paints later', () => {
    const near = depthKey({ x: 5, y: 5 });
    const far = depthKey({ x: 1, y: 1 });
    expect(near).toBeGreaterThan(far);
  });

  it('paints a wall behind an object and an object behind a character on the same tile', () => {
    const tile = { x: 4, y: 4 };
    expect(depthKey(tile, DEPTH_BIAS.WALL)).toBeLessThan(depthKey(tile, DEPTH_BIAS.OBJECT));
    expect(depthKey(tile, DEPTH_BIAS.OBJECT)).toBeLessThan(depthKey(tile, DEPTH_BIAS.CHARACTER));
  });

  it('always paints the ground pass before the scene pass', () => {
    const sorted = sortByDepth([
      { id: 'far-floor', pass: RENDER_PASS.GROUND, depth: depthKey({ x: 8, y: 7 }, DEPTH_BIAS.FLOOR) },
      { id: 'near-object', pass: RENDER_PASS.SCENE, depth: depthKey({ x: 1, y: 1 }) },
    ]);
    expect(sorted.map((n) => n.id)).toEqual(['far-floor', 'near-object']);
  });

  it('orders a character behind a sofa before the sofa itself', () => {
    const sofaAnchor = { x: 2, y: 6 };
    const sofaDepth = depthKey(frontTile(sofaAnchor, OBJECT_DEFINITIONS.SOFA.footprint), DEPTH_BIAS.OBJECT);
    const behind = depthKey({ x: 2, y: 5 }, DEPTH_BIAS.CHARACTER);
    const inFront = depthKey({ x: 3, y: 7 }, DEPTH_BIAS.CHARACTER);
    expect(behind).toBeLessThan(sofaDepth);
    expect(inFront).toBeGreaterThan(sofaDepth);
  });

  it('emits a fully sorted node list from the scene builder', () => {
    const scene = buildWorldScene({ save: saveWithBand(), viewport: { width: 390, height: 844, insets } });
    const keys = scene.nodes.map((n) => n.pass * 1e6 + n.depth);
    expect([...keys].sort((a, b) => a - b)).toEqual(keys);
  });
});

// 6 ------------------------------------------------------------------ object interaction hit test
describe('object interaction hit test', () => {
  it('maps world objects onto existing routes', () => {
    const instances = resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home');
    const target = (id: string) => instances.find((o) => o.instanceId === id)!.target;
    expect(target('PHONE_DESK')).toBe('/inbox');
    expect(target('NOTICE_BOARD')).toBe('/audition');
    expect(target('EXIT_DOOR')).toBe('/outside');
    expect(target('RECORDING_ROOM_ENTRANCE')).toBe('/management/facilities');
    expect(instances.find((o) => o.instanceId === 'SOFA')!.target).toBeUndefined();
  });

  it('accepts taps on the footprint and on the interaction tile', () => {
    const instances = resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home');
    const targets = instances.map((o) => ({
      id: o.instanceId, pass: RENDER_PASS.SCENE, depth: depthKey(o.depthAnchor),
      tiles: o.hitTiles, interactive: !!o.target,
    }));
    expect(pickTargetAtTile({ x: 7, y: 6 }, targets)?.id).toBe('PHONE_DESK');   // footprint
    expect(pickTargetAtTile({ x: 7, y: 5 }, targets)?.id).toBe('PHONE_DESK');   // interaction tile
    expect(pickTargetAtTile({ x: 5, y: 5 }, targets)).toBeNull();               // empty floor
  });

  it('derives the interaction tile from the definition offset', () => {
    expect(interactionTileFor('PHONE_DESK', { x: 7, y: 6 })).toEqual({ x: 7, y: 5, z: 0 });
    expect(depthAnchorFor('PHONE_DESK', { x: 7, y: 6 })).toEqual({ x: 8, y: 6, z: 0 });
  });

  it('keeps a finger-sized tap radius even when zoomed far out', () => {
    const cam = fitCameraToTiles([{ x: 0, y: 0 }, { x: 12, y: 7 }], { width: 320, height: 568, insets });
    expect(tapRadiusFor(1, cam, proj)).toBeGreaterThanOrEqual(MIN_TAP_RADIUS_PX);
  });
});

// 7 ------------------------------------------------------------------ stage mapping
describe('stage 1 -> stage 2 state mapping', () => {
  it('extends the map by a patch instead of replacing it', () => {
    expect(BASECAMP_STAGE_2.floorTiles.length).toBeGreaterThan(BASECAMP_STAGE_1.floorTiles.length);
    expect(hasFloorAt(BASECAMP_STAGE_1, { x: 10, y: 2 })).toBe(false);
    expect(hasFloorAt(BASECAMP_STAGE_2, { x: 10, y: 2 })).toBe(true);
    // the door is the SAME instance in both stages - only its state changes
    const inStage1 = BASECAMP_STAGE_1.objects.find((o) => o.instanceId === 'RECORDING_ROOM_ENTRANCE');
    const inStage2 = BASECAMP_STAGE_2.objects.find((o) => o.instanceId === 'RECORDING_ROOM_ENTRANCE');
    expect(inStage1?.anchor).toEqual(inStage2?.anchor);
  });

  it('never moves an existing object when patching', () => {
    const patched = applyMapPatch(BASECAMP_STAGE_1, BASECAMP_STAGE_2_PATCH);
    BASECAMP_STAGE_1.objects.forEach((o) => {
      expect(patched.objects.find((p) => p.instanceId === o.instanceId)?.anchor).toEqual(o.anchor);
    });
  });

  it('drives the door state from SaveData, not from the map', () => {
    const locked = createNewGame('T');
    const stateOf = (save: SaveData, map = BASECAMP_STAGE_1) =>
      resolveObjectInstances(map, save, 'home').find((o) => o.instanceId === 'RECORDING_ROOM_ENTRANCE')!.state;
    expect(stateOf(locked)).toBe('locked');

    const afterShow = createNewGame('T');
    afterShow.performanceHistory.push({
      id: 'perf_00001', week: 3, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
      lineup: [], openingSongTitle: 'x', audience: 40, grade: 'GOOD SHOW', revenue: 1, fansDelta: 1,
      reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
    });
    expect(stateOf(afterShow)).toBe('buildable');

    afterShow.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    expect(stateOf(afterShow, BASECAMP_STAGE_2)).toBe('built');
  });

  it('selects the map from the basecamp stage', () => {
    expect(basecampMapForStage(1).id).toBe('BASECAMP_STAGE_1');
    expect(basecampMapForStage(2).id).toBe('BASECAMP_STAGE_2');
    expect(basecampMapForStage(99).id).toBe('BASECAMP_STAGE_2');
  });

  it('builds the stage 2 scene once the facility is built', () => {
    const save = saveWithBand();
    save.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    const scene = buildWorldScene({ save, viewport: { width: 390, height: 844, insets } });
    expect(scene.stage).toBe(2);
    expect(scene.nodes.some((n) => n.id === 'object:RECORDING_DESK')).toBe(true);
  });
});

// 8 ------------------------------------------------------------------ character spawns
describe('character spawn architecture', () => {
  it('places lineup members on their slot spawn tile, not on screen percentages', () => {
    const placements = resolveCharacterPlacements(BASECAMP_STAGE_1, saveWithBand());
    const vocal = placements.find((p) => p.characterId === 'C01')!;
    expect(vocal.pos).toEqual(spawnForSlot(BASECAMP_STAGE_1, 'VOCAL')!.pos);
    expect(Number.isInteger(vocal.pos.x) && Number.isInteger(vocal.pos.y)).toBe(true);
  });

  it('places a hired session on the slot it fills', () => {
    const session = resolveCharacterPlacements(BASECAMP_STAGE_1, saveWithBand()).find((p) => p.kind === 'session')!;
    expect(session.pos).toEqual(spawnForSlot(BASECAMP_STAGE_1, 'BASS')!.pos);
  });

  it('sends unassigned members to idle spawns without sharing a tile', () => {
    const save = saveWithBand();
    save.band.activeMembers = ['C01', 'C04', 'C07'];
    const placements = resolveCharacterPlacements(BASECAMP_STAGE_1, save);
    const keys = placements.map((p) => `${p.pos.x},${p.pos.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never spawns a character on a blocked tile', () => {
    const grid = new OccupancyGrid(occupancyPlacements(resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home')));
    BASECAMP_STAGE_1.spawnPoints.forEach((s) => expect(grid.isBlocked(s.pos)).toBe(false));
  });
});

// 9 ------------------------------------------------------------------ responsive camera
describe('responsive camera fit', () => {
  it('keeps identical object coordinates on every viewport and only changes the camera', () => {
    const save = saveWithBand();
    const scenes = VIEWPORTS.map((v) => buildWorldScene({ save, viewport: { ...v, insets } }));
    const anchors = scenes.map((s) => s.nodes.filter((n) => n.kind === 'object').map((n) => `${n.id}@${n.anchor.x},${n.anchor.y}`));
    anchors.forEach((a) => expect(a).toEqual(anchors[0]));
    const zooms = scenes.map((s) => s.camera.zoom);
    expect(new Set(zooms).size).toBeGreaterThan(1);
  });

  it('zooms out on a small phone rather than moving objects', () => {
    const save = saveWithBand();
    const small = buildWorldScene({ save, viewport: { width: 320, height: 568, insets } });
    const large = buildWorldScene({ save, viewport: { width: 430, height: 932, insets } });
    expect(small.camera.zoom).toBeLessThan(large.camera.zoom);
  });

  it('frames every interactive object inside the safe viewport on all presets', () => {
    const save = saveWithBand();
    VIEWPORTS.forEach((v) => {
      const scene = buildWorldScene({ save, viewport: { ...v, insets } });
      scene.nodes.filter((n) => n.kind === 'object' && n.target).forEach((n) => {
        expect(isTileInSafeArea(n.anchor, scene.camera, proj)).toBe(true);
      });
    });
  });

  it('excludes the HUD and Dock from the safe rect', () => {
    const rect = safeRectOf({ width: 390, height: 844, insets });
    expect(rect.y).toBe(insets.top);
    expect(rect.height).toBe(844 - insets.top - insets.bottom);
  });

  it('respects the zoom clamp', () => {
    const bounds = boundsForTiles([{ x: 0, y: 0 }, { x: 200, y: 200 }], proj, 0);
    const cam = fitCamera(bounds, { width: 320, height: 568, insets }, { minZoom: 0.5, maxZoom: 1, padding: 8 });
    expect(cam.zoom).toBe(0.5);
    expect(cam.clamped).toBe(true);
  });

  it('keeps the whole authored camera bound in view at 390x844', () => {
    const cam = fitCamera(cameraBoundsOf(BASECAMP_STAGE_1), { width: 390, height: 844, insets });
    expect(cam.clamped).toBe(false);
    expect(cam.zoom).toBeGreaterThan(0);
  });
});
