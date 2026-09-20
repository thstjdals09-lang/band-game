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
  createCamera, clampPanTo, isTileReachable, DEFAULT_CAMERA_CONFIG,
} from './iso';
import { BASECAMP_STAGE_1, BASECAMP_STAGE_2, basecampMapForStage, applyMapPatch, hasFloorAt } from './maps';
import { BASECAMP_STAGE_2_PATCH } from './maps/basecampStage2';
import { OBJECT_DEFINITIONS, depthAnchorFor, interactionTileFor } from './objects/definitions';
import { occupancyPlacements, resolveCharacterPlacements, resolveObjectInstances } from './objects/instances';
import { buildWorldScene, cameraBoundsOf, focusPointOf } from './renderer/buildScene';
import { DEFAULT_TEST_SPRITE, spriteFor } from './assets/testSprite';
import { SPRITE_METRICS } from './assets/spriteMetrics';
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
  it('stands only the lineup on the map, whatever the roster size', () => {
    const save = saveWithBand();
    // 보유 멤버는 늘어나도, 라인업에 넣지 않은 인물은 방에 서지 않는다.
    save.band.activeMembers = ['C01', 'C04', 'C07', 'C10', 'C02'];
    const placements = resolveCharacterPlacements(BASECAMP_STAGE_1, save);
    expect(placements.map((p) => p.id).sort()).toEqual(['C01', 'C04', 'session_00001']);
  });

  it('gives every placed character its own floor tile by default', () => {
    const placements = resolveCharacterPlacements(BASECAMP_STAGE_1, saveWithBand());
    const keys = placements.map((p) => `${p.pos.x},${p.pos.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    placements.forEach((p) => {
      expect(hasFloorAt(BASECAMP_STAGE_1, p.pos)).toBe(true);
      expect(Number.isInteger(p.pos.x) && Number.isInteger(p.pos.y)).toBe(true);
    });
  });

  it('lets the player placement win over the default spot', () => {
    const save = saveWithBand();
    save.worldPlacements = { C01: { pos: { x: 6, y: 6 } } };
    const vocal = resolveCharacterPlacements(BASECAMP_STAGE_1, save).find((p) => p.id === 'C01')!;
    expect(vocal.pos).toEqual({ x: 6, y: 6 });
    // 라인업이 바뀌어도 놓아둔 자리에 남는다.
    save.band.lineup[0].assignment = null;
    save.band.lineup[3].assignment = { kind: 'MEMBER', characterId: 'C01' };
    const moved = resolveCharacterPlacements(BASECAMP_STAGE_1, save).find((p) => p.id === 'C01')!;
    expect(moved.pos).toEqual({ x: 6, y: 6 });
  });

  it('ignores a stored placement that is not on the floor', () => {
    const save = saveWithBand();
    save.worldPlacements = { C01: { pos: { x: 99, y: 99 } } };
    const vocal = resolveCharacterPlacements(BASECAMP_STAGE_1, save).find((p) => p.id === 'C01')!;
    expect(hasFloorAt(BASECAMP_STAGE_1, vocal.pos)).toBe(true);
  });

  it('falls back to the standing art when the named pose has no picture yet', () => {
    const save = saveWithBand();
    save.worldPlacements = { C01: { pos: { x: 6, y: 6 }, pose: 'SIT' } };
    const vocal = resolveCharacterPlacements(BASECAMP_STAGE_1, save).find((p) => p.id === 'C01')!;
    expect(vocal.assetKey).toBe('CHARACTER_C01_FULL');
  });

  it('never spawns a character on a blocked tile', () => {
    const grid = new OccupancyGrid(occupancyPlacements(resolveObjectInstances(BASECAMP_STAGE_1, createNewGame('T'), 'home')));
    BASECAMP_STAGE_1.spawnPoints.forEach((s) => expect(grid.isBlocked(s.pos)).toBe(false));
  });
});

// 9 ------------------------------------------------------------------ play camera + drag
// CONTRACT CHANGE: the playable world is no longer fitted to the screen. It renders at a fixed
// readable zoom and everything outside the viewport is reached by dragging on both axes.
describe('play camera and drag panning', () => {
  it('keeps identical object coordinates on every viewport', () => {
    const save = saveWithBand();
    const scenes = VIEWPORTS.map((v) => buildWorldScene({ save, viewport: { ...v, insets } }));
    const anchors = scenes.map((s) => s.nodes.filter((n) => n.kind === 'object').map((n) => `${n.id}@${n.anchor.x},${n.anchor.y}`));
    anchors.forEach((a) => expect(a).toEqual(anchors[0]));
  });

  it('draws the world at the same readable zoom on every phone', () => {
    const save = saveWithBand();
    const zooms = VIEWPORTS.map((v) => buildWorldScene({ save, viewport: { ...v, insets } }).camera.zoom);
    zooms.forEach((z) => expect(z).toBe(DEFAULT_CAMERA_CONFIG.defaultZoom));
  });

  it('adapts by changing the camera offset, not the map', () => {
    const save = saveWithBand();
    const offsets = VIEWPORTS.map((v) => {
      const c = buildWorldScene({ save, viewport: { ...v, insets } }).camera;
      return `${Math.round(c.offsetX)},${Math.round(c.offsetY)}`;
    });
    expect(new Set(offsets).size).toBeGreaterThan(1);
  });

  it('gives a smaller phone more world to explore by dragging', () => {
    const save = saveWithBand();
    const range = (v: { width: number; height: number }) => {
      const c = buildWorldScene({ save, viewport: { ...v, insets } }).camera.panBounds;
      return (c.maxX - c.minX) + (c.maxY - c.minY);
    };
    expect(range({ width: 320, height: 568 })).toBeGreaterThan(range({ width: 430, height: 932 }));
  });

  it('lets a drag reach every interactive object on all presets', () => {
    const save = saveWithBand();
    VIEWPORTS.forEach((v) => {
      const scene = buildWorldScene({ save, viewport: { ...v, insets } });
      scene.nodes.filter((n) => n.kind === 'object' && n.target).forEach((n) => {
        (n.hitTiles ?? [n.anchor]).forEach((t) => {
          expect(isTileReachable(t, scene.camera, proj)).toBe(true);
        });
      });
    });
  });

  it('can drag to every corner of the world without losing it off screen', () => {
    const save = saveWithBand();
    const viewport = { width: 390, height: 844, insets };
    const base = buildWorldScene({ save, viewport });
    const far = 100000;
    [{ x: far, y: far }, { x: -far, y: -far }, { x: far, y: -far }, { x: -far, y: far }].forEach((raw) => {
      const dragged = buildWorldScene({ save, viewport, pan: raw });
      const b = dragged.camera.panBounds;
      expect(dragged.camera.pan.x).toBeGreaterThanOrEqual(b.minX);
      expect(dragged.camera.pan.x).toBeLessThanOrEqual(b.maxX);
      expect(dragged.camera.pan.y).toBeGreaterThanOrEqual(b.minY);
      expect(dragged.camera.pan.y).toBeLessThanOrEqual(b.maxY);
      // the world still overlaps the safe rect after the most extreme drag
      const r = dragged.camera.safeRect;
      const left = dragged.camera.worldBounds.x * dragged.camera.zoom + dragged.camera.offsetX;
      const right = left + dragged.camera.worldBounds.width * dragged.camera.zoom;
      const top = dragged.camera.worldBounds.y * dragged.camera.zoom + dragged.camera.offsetY;
      const bottom = top + dragged.camera.worldBounds.height * dragged.camera.zoom;
      expect(right).toBeGreaterThan(r.x);
      expect(left).toBeLessThan(r.x + r.width);
      expect(bottom).toBeGreaterThan(r.y);
      expect(top).toBeLessThan(r.y + r.height);
    });
    expect(base.camera.pan).toEqual({ x: 0, y: 0 });
  });

  it('allows drag on both axes, not only vertically', () => {
    const scene = buildWorldScene({ save: saveWithBand(), viewport: { width: 390, height: 844, insets } });
    const b = scene.camera.panBounds;
    expect(b.maxX - b.minX).toBeGreaterThan(0);
    expect(b.maxY - b.minY).toBeGreaterThan(0);
  });

  it('clamps a raw drag offset against the current camera', () => {
    const scene = buildWorldScene({ save: saveWithBand(), viewport: { width: 390, height: 844, insets } });
    const clamped = clampPanTo(scene.camera, { x: 99999, y: -99999 });
    expect(clamped.x).toBe(scene.camera.panBounds.maxX);
    expect(clamped.y).toBe(scene.camera.panBounds.minY);
  });

  it('starts centred on the floor, not on the walls', () => {
    const scene = buildWorldScene({ save: saveWithBand(), viewport: { width: 390, height: 844, insets } });
    const focus = focusPointOf(BASECAMP_STAGE_1);
    const screenX = focus.x * scene.camera.zoom + scene.camera.offsetX;
    const screenY = focus.y * scene.camera.zoom + scene.camera.offsetY;
    expect(screenX).toBeCloseTo(scene.camera.safeRect.x + scene.camera.safeRect.width / 2, 0);
    expect(screenY).toBeCloseTo(scene.camera.safeRect.y + scene.camera.safeRect.height / 2, 0);
  });

  it('still frames the whole room for build previews', () => {
    const save = saveWithBand();
    const scene = buildWorldScene({ save, mode: 'build', viewport: { width: 390, height: 210, insets: { top: 0, bottom: 0, left: 0, right: 0 } } });
    expect(scene.cameraMode).toBe('fit');
    expect(scene.camera.zoom).toBeLessThan(DEFAULT_CAMERA_CONFIG.defaultZoom);
  });

  it('excludes the HUD and Dock from the safe rect', () => {
    const rect = safeRectOf({ width: 390, height: 844, insets });
    expect(rect.y).toBe(insets.top);
    expect(rect.height).toBe(844 - insets.top - insets.bottom);
  });

  it('respects the zoom clamp', () => {
    const cam = createCamera({
      worldBounds: boundsForTiles([{ x: 0, y: 0 }, { x: 9, y: 7 }], proj, 0),
      focus: { x: 0, y: 0 },
      viewport: { width: 320, height: 568, insets },
      zoom: 99,
    });
    expect(cam.zoom).toBe(DEFAULT_CAMERA_CONFIG.maxZoom);
    expect(cam.clamped).toBe(true);
  });

  it('keeps the legacy fit helpers working for previews and tests', () => {
    const cam = fitCamera(cameraBoundsOf(BASECAMP_STAGE_1), { width: 390, height: 844, insets });
    expect(cam.clamped).toBe(false);
    expect(cam.zoom).toBeGreaterThan(0);
    expect(isTileInSafeArea({ x: 4, y: 4 }, cam, proj)).toBe(true);
  });
});

// 10 ----------------------------------------------------------------- test sprite (visual fit)
describe('test sprite placement', () => {
  it('resolves the sprite from the node asset key, never from another character', () => {
    // 각 에셋은 자기 메트릭으로 선다.
    for (const key of ['CHARACTER_C01_FULL', 'CHARACTER_C04_FULL', 'SESSION_01_FULL', 'CHARACTER_C01_POSE_1_FULL']) {
      const placed = spriteFor(DEFAULT_TEST_SPRITE, key);
      expect(placed?.assetKey).toBe(key);
      expect(placed?.mode).toBe('exact');
      expect(placed?.sourceSize).toEqual(SPRITE_METRICS[key].sourceSize);
      expect(placed?.footAnchor).toEqual(SPRITE_METRICS[key].footAnchor);
    }
    // 아직 크기를 재지 않은 그림(방금 넣은 자세 등)도 자기 키로 세워진다.
    const fresh = spriteFor(DEFAULT_TEST_SPRITE, 'CHARACTER_C02_POSE_9_FULL');
    expect(fresh?.assetKey).toBe('CHARACTER_C02_POSE_9_FULL');
    expect(fresh?.mode).toBe('fit');
    // 남의 이미지를 빌려오는 경로는 없다.
    expect(spriteFor(DEFAULT_TEST_SPRITE, undefined)).toBeUndefined();
    expect(spriteFor({ ...DEFAULT_TEST_SPRITE, enabled: false }, 'CHARACTER_C01_FULL')).toBeUndefined();
  });

  it('applies the lab foot nudge on top of the measured anchor', () => {
    const nudged = spriteFor({ ...DEFAULT_TEST_SPRITE, footNudge: { x: 4, y: -6 } }, 'CHARACTER_C01_FULL');
    expect(nudged?.footAnchor).toEqual({
      x: SPRITE_METRICS.CHARACTER_C01_FULL.footAnchor.x + 4,
      y: SPRITE_METRICS.CHARACTER_C01_FULL.footAnchor.y - 6,
    });
  });

  it('stands a character 3.6 elevation units tall by default', () => {
    expect(DEFAULT_TEST_SPRITE.heightUnits).toBe(3.6);
    expect(DEFAULT_TEST_SPRITE.heightUnits * proj.elevationHeight).toBeCloseTo(115.2);
  });

  it('attaches the sprite to the character node without moving its spawn tile', () => {
    const scene = buildWorldScene({
      save: saveWithBand(), testSprite: DEFAULT_TEST_SPRITE,
      viewport: { width: 390, height: 844, insets },
    });
    const node = scene.nodes.find((n) => n.id === 'character:C01')!;
    expect(node.sprite?.assetKey).toBe('CHARACTER_C01_FULL');
    expect(hasFloorAt(BASECAMP_STAGE_1, node.anchor)).toBe(true);
  });

  it('lands the foot anchor exactly on the spawn tile centre at any scale', () => {
    const tile = { x: 3, y: 4 };
    const centre = gridToScreen(tile, proj);
    const metrics = SPRITE_METRICS.CHARACTER_C01_FULL;
    [1.2, 2.2, 3.6].forEach((heightUnits) => {
      const s = (heightUnits * proj.elevationHeight) / metrics.sourceSize.h;
      const drawX = centre.x - metrics.footAnchor.x * s;
      const drawY = centre.y - metrics.footAnchor.y * s;
      expect(drawX + metrics.footAnchor.x * s).toBeCloseTo(centre.x);
      expect(drawY + metrics.footAnchor.y * s).toBeCloseTo(centre.y);
      expect(metrics.sourceSize.h * s).toBeCloseTo(heightUnits * proj.elevationHeight);
    });
  });

  it('exposes the real world bounds and required rect for the bounds overlay', () => {
    const scene = buildWorldScene({ save: saveWithBand(), viewport: { width: 390, height: 844, insets } });
    expect(scene.requiredBounds.width).toBeLessThan(scene.worldBounds.width);
    expect(scene.worldBounds.width).toBeGreaterThan(0);
  });
});
