// PHASE 2A growth loop tests: weekly simulation, growth, songs, releases, career and repeat shows.
import { describe, expect, it } from 'vitest';

import { ACTIVITIES, CHARACTERS, PROTOTYPE_BALANCE, RELEASE_FORMATS, VENUES, type MainActionId } from '@/data/master';
import { createNewGame } from '@/state/save/newGame';
import { EMPTY_SONG_WORK, isRecorded } from '@/state/save/schema';
import type { SaveData } from '@/state/save/schema';
import { simulateWeek, weeklyMusicIncome, buildLiveOffers } from './weekEngine';
import { projectedExpense } from '@/state/selectors';
import { createSong } from './song';
import { bandDna, songDna, dnaSimilarity } from './musicDna';
import { achievedMilestones, careerTierFor, facilityAvailabilityFor, activityUnlocked, unlockedRevenueStreams } from './career';
import { growthMultiplier, stageForExperience, statGainsForStage, effectiveExperience } from './growth';
import { createRng } from './rng';
import { resolvePerformance, preparedness, scoreOf, gradeOf } from './performance';

const B = PROTOTYPE_BALANCE;

function writing(save: SaveData): SaveData {
  save.weeklyPlan.songWork.newSong = true;
  return save;
}

function band(): SaveData {
  const s = createNewGame('T');
  s.band.activeMembers = ['C01', 'C04'];
  s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' }; // VOCAL
  s.band.lineup[1].assignment = { kind: 'MEMBER', characterId: 'C04' }; // GUITAR
  s.band.name = 'TEST';
  return s;
}

function apply(save: SaveData, plan: SaveData['weeklyPlan']): SaveData {
  const next: SaveData = structuredClone(save);
  next.weeklyPlan = plan;
  const outcome = simulateWeek(next);
  // mirror commitWeek's member application for the parts these tests assert
  outcome.members.forEach((m) => {
    const st = next.characterStates[m.characterId]!;
    st.condition.energy = Math.max(0, Math.min(100, Math.round(st.condition.energy + m.energy)));
    st.condition.stress = Math.max(0, Math.min(100, Math.round(st.condition.stress + m.stress)));
    st.growth.experience += m.experience;
    st.growth.developmentStage = stageForExperience(st.growth.experience);
    const base = CHARACTERS[m.characterId].visibleStats;
    (Object.keys(m.statGains) as (keyof typeof base)[]).forEach((k) => {
      st.currentStats[k] = Math.min(100, (st.currentStats[k] ?? base[k]) + (m.statGains[k] ?? 0));
    });
  });
  next.world.week += 1;
  next.rng.streams.world += 1;
  next.weeklyPlan = { mainActions: [null, null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } };
  return next;
}

// 1 -------------------------------------------------------------- determinism / no double award
describe('week simulation is deterministic and single-shot', () => {
  it('produces the same outcome for the same save and rng position', () => {
    const s = band();
    s.weeklyPlan.mainActions = ['PRACTICE', 'PROMOTION', null];
    const a = simulateWeek(s);
    const b = simulateWeek(structuredClone(s));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('changes once the rng stream advances, so weeks are not copies of each other', () => {
    const s = band();
    s.weeklyPlan.mainActions = ['PRACTICE', null, null];
    const first = simulateWeek(s);
    const later = writing(structuredClone(s));
    later.rng.streams.world = 5;
    expect(simulateWeek(later).newSong?.title).toBeDefined();
    expect(first.rngPosition).not.toBe(simulateWeek(later).rngPosition);
  });

  it('stamps the week it was computed for so a stale outcome can be rejected', () => {
    const s = band();
    s.weeklyPlan.mainActions = ['PRACTICE', null, null];
    const o = simulateWeek(s);
    expect(o.week).toBe(s.world.week);
    expect(o.year).toBe(s.world.year);
    expect(o.rngPosition).toBe(s.rng.streams.world);
  });
});

// 2 -------------------------------------------------------------- activities differ
describe('activities have distinct effects', () => {
  it('practice trains, rest recovers, promotion brings fans', () => {
    const s = band();
    const practice = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PRACTICE', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const rest = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['REST', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const promo = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });

    expect(practice.members[0].experience).toBeGreaterThan(0);
    expect(practice.members[0].energy).toBeLessThan(0);
    expect(rest.members[0].energy).toBeGreaterThan(0);
    expect(rest.members[0].experience).toBe(0);
    expect(promo.fansDelta).toBeGreaterThan(0);
    expect(practice.fansDelta).toBe(0);
  });

  it('charges nothing extra for basic practice, but still trains', () => {
    const practice = ACTIVITIES.find((a) => a.scope === 'BAND' && a.id === 'PRACTICE')!;
    expect(practice.cost).toBe(0);

    const s = band();
    const idle = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['REST', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const trained = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PRACTICE', 'PRACTICE', 'PRACTICE'], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    // three practice slots cost exactly what an empty week costs: salaries and session fees only
    expect(trained.expense).toBe(idle.expense);
    expect(trained.members[0].experience).toBeGreaterThan(0);
  });

  it('an individual lesson only trains the chosen member', () => {
    const s = band();
    const o = simulateWeek({
      ...s,
      weeklyPlan: { mainActions: ['REST', null, null], individualActions: [{ characterId: 'C04', actionId: 'PRIVATE_LESSON' }], songWork: { ...EMPTY_SONG_WORK } },
    });
    const chaerin = o.members.find((m) => m.characterId === 'C04')!;
    const hajin = o.members.find((m) => m.characterId === 'C01')!;
    expect(chaerin.experience).toBeGreaterThan(0);
    expect(hajin.experience).toBe(0);
  });

  it('a tired member learns less than a fresh one', () => {
    const fresh = effectiveExperience(100, { energy: 90, stress: 10, morale: 70 });
    const tired = effectiveExperience(100, { energy: 10, stress: 10, morale: 70 });
    const stressed = effectiveExperience(100, { energy: 90, stress: 95, morale: 70 });
    expect(tired).toBeLessThan(fresh);
    expect(stressed).toBeLessThan(fresh);
  });

  it('stamina makes a tour engine burn slower than a live bomb', () => {
    const s = createNewGame('T');
    s.band.activeMembers = ['C10', 'C11'];
    s.weeklyPlan.mainActions = ['PRACTICE', null, null];
    const o = simulateWeek(s);
    const woojae = o.members.find((m) => m.characterId === 'C10')!;
    const arin = o.members.find((m) => m.characterId === 'C11')!;
    expect(Math.abs(woojae.energy)).toBeLessThan(Math.abs(arin.energy));
  });
});

// 3 -------------------------------------------------------------- growth
describe('member growth follows the growth profile', () => {
  it('banks experience and raises the development stage', () => {
    let s = band();
    for (let i = 0; i < 8; i += 1) {
      s = apply(s, { mainActions: ['PRACTICE', 'PRACTICE', 'REST'], individualActions: [], songWork: { ...EMPTY_SONG_WORK } });
    }
    const st = s.characterStates.C04!;
    expect(st.growth.experience).toBeGreaterThan(0);
    expect(st.growth.developmentStage).toBeGreaterThan(0);
  });

  it('actually raises the visible stats above the master values', () => {
    let s = band();
    for (let i = 0; i < 10; i += 1) {
      s = apply(s, { mainActions: ['PRACTICE', 'PRACTICE', 'REST'], individualActions: [], songWork: { ...EMPTY_SONG_WORK } });
    }
    const before = CHARACTERS.C04.visibleStats;
    const now = { ...before, ...s.characterStates.C04!.currentStats };
    const grew = (Object.keys(before) as (keyof typeof before)[]).some((k) => now[k] > before[k]);
    expect(grew).toBe(true);
  });

  it('never pushes a stat past the character potential', () => {
    const potential = CHARACTERS.C04.growthProfile.overallPotential;
    const current = { ...CHARACTERS.C04.visibleStats };
    for (let stage = 1; stage <= 10; stage += 1) {
      const { gains } = statGainsForStage('C04', stage, current);
      (Object.keys(gains) as (keyof typeof current)[]).forEach((k) => { current[k] += gains[k] ?? 0; });
    }
    (Object.keys(current) as (keyof typeof current)[]).forEach((k) => {
      expect(current[k]).toBeLessThanOrEqual(potential);
    });
  });

  it('uses the documented curve shapes', () => {
    expect(growthMultiplier('EARLY_FAST', 0)).toBeGreaterThan(growthMultiplier('EARLY_FAST', 6));
    expect(growthMultiplier('LATE_EXPONENTIAL', 6)).toBeGreaterThan(growthMultiplier('LATE_EXPONENTIAL', 0));
    expect(growthMultiplier('PLATEAU', 6)).toBeLessThan(growthMultiplier('PLATEAU', 0));
  });
});

// 4 -------------------------------------------------------------- songs
describe('song creation', () => {
  it('keeps producing songs past the old two-song prototype limit', () => {
    let s = band();
    for (let i = 0; i < 6; i += 1) {
      const next = structuredClone(s);
      next.weeklyPlan = { mainActions: ['PRACTICE', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK, newSong: true } };
      const o = simulateWeek(next);
      expect(o.newSong).not.toBeNull();
      next.songs[`song_${i}`] = { id: `song_${i}`, ...o.newSong! };
      next.world.week += 1;
      next.rng.streams.world += 1;
      s = next;
    }
    expect(Object.keys(s.songs)).toHaveLength(6);
  });

  it('derives the four axes from real member data, not a constant', () => {
    const rng = createRng(1, 'world', 0);
    const pop = band();
    pop.band.activeMembers = ['C01', 'C06']; // star front + hitmaker
    pop.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' };
    pop.band.lineup[1].assignment = null;
    const art = band();
    art.band.activeMembers = ['C02', 'C09']; // mood architect + genre wildcard
    art.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C02' };
    art.band.lineup[1].assignment = null;

    const popular = createSong({ save: pop, origin: 'PRACTICE', week: 1, rng })!;
    const arty = createSong({ save: art, origin: 'PRACTICE', week: 1, rng })!;
    expect(popular.song.musicProfile.popularity).toBeGreaterThan(arty.song.musicProfile.popularity);
    expect(arty.song.musicProfile.artistry).toBeGreaterThan(0);
  });

  it('changes the sound when the role layout changes', () => {
    const a = band();
    a.band.activeMembers = ['C01', 'C06'];
    a.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' }; // vocal fronts
    const b = structuredClone(a);
    b.band.lineup[0].assignment = null;
    b.band.lineup.push({ slotId: 'KEYS', assignment: { kind: 'MEMBER', characterId: 'C06' } }); // producer steers
    const dnaA = bandDna(a)!;
    const dnaB = bandDna(b)!;
    expect(dnaA.mean.accessibility).not.toBeCloseTo(dnaB.mean.accessibility, 3);
  });

  it('gives the song a title and an origin drawn from the session', () => {
    const rng = createRng(7, 'world', 0);
    const created = createSong({ save: band(), origin: 'RECORDING', week: 4, rng })!;
    expect(created.song.title.length).toBeGreaterThan(0);
    expect(created.song.title).not.toContain('Untitled Demo');
    expect(created.song.originContext).toContain('RECORDING_SESSION');
    expect(created.song.contributors.composer.length).toBe(1);
    expect(created.song.musicDna).toBeDefined();
  });

  it('never writes the same title twice', () => {
    let s = band();
    const titles: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const next = structuredClone(s);
      next.weeklyPlan = { mainActions: ['PRACTICE', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK, newSong: true } };
      const o = simulateWeek(next);
      titles.push(o.newSong!.title);
      next.songs[`song_${i}`] = { id: `song_${i}`, ...o.newSong! };
      next.world.week += 1;
      next.rng.streams.world += 1;
      s = next;
    }
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('measures fan fit against what has already been released', () => {
    const dna = bandDna(band())!;
    const a = songDna(dna, 'C01');
    expect(dnaSimilarity(a, a)).toBeCloseTo(1);
  });
});

// 4b ------------------------------------------------------------- v1 song work rules
describe('v1 규칙 1: a demo needs a booking and a rehearsal slot', () => {
  const plan = (actions: (MainActionId | null)[], songWork: Partial<SaveData['weeklyPlan']['songWork']> = {}): SaveData['weeklyPlan'] =>
    ({ mainActions: actions, individualActions: [], songWork: { ...EMPTY_SONG_WORK, ...songWork } });

  it('writes nothing when rehearsal was not booked for new-song work', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', 'PRACTICE', 'PRACTICE']) });
    expect(o.newSong).toBeNull();
  });

  it('writes a demo when the work is booked', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null], { newSong: true }) });
    expect(o.newSong).not.toBeNull();
    expect(o.newSong!.recordedWeek ?? null).toBeNull();
  });

  it('writes nothing when the booking has no rehearsal slot to spend', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['REST', 'PROMOTION', null], { newSong: true }) });
    expect(o.newSong).toBeNull();
    expect(o.log.some((l) => l.effects.join(' ').includes('합주 슬롯'))).toBe(true);
  });

  it('writes at most one demo a week however many slots are booked', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', 'PRACTICE', 'PRACTICE'], { newSong: true }) });
    expect(o.newSong).not.toBeNull();
    expect(o.log.filter((l) => l.kind === 'SONG' && l.title === o.newSong!.title)).toHaveLength(1);
  });

  it('still trains the band on every rehearsal slot', () => {
    const s = band();
    const writingWeek = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['PRACTICE', 'PRACTICE', null], { newSong: true }) });
    const plainWeek = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['PRACTICE', 'PRACTICE', null]) });
    expect(writingWeek.members[0].experience).toBe(plainWeek.members[0].experience);
  });
});

describe('v1 규칙 2: rehearsal that is not writing prepares a song', () => {
  const plan = (actions: (MainActionId | null)[], songWork: Partial<SaveData['weeklyPlan']['songWork']> = {}): SaveData['weeklyPlan'] =>
    ({ mainActions: actions, individualActions: [], songWork: { ...EMPTY_SONG_WORK, ...songWork } });

  it('follows the opening song of the booked show', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: 'b', status: 'SCHEDULED' };
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null]) });
    expect(o.rehearsal?.songId).toBe('b');
  });

  it('lets the player pin another song instead', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: 'b', status: 'SCHEDULED' };
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null], { rehearsalSongId: 'a' }) });
    expect(o.rehearsal?.songId).toBe('a');
  });

  it('counts every rehearsal slot left after the writing slot', () => {
    const s = band();
    s.songs.a = song('A', 60);
    const writingWeek = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['PRACTICE', 'PRACTICE', 'PRACTICE'], { newSong: true }) });
    const plainWeek = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['PRACTICE', 'PRACTICE', 'PRACTICE']) });
    expect(writingWeek.rehearsal?.slots).toBe(2);
    expect(plainWeek.rehearsal?.slots).toBe(3);
  });

  it('still rehearses a song that has already been released (명세 §3·§5)', () => {
    const s = band();
    s.songs.a = { ...song('A', 60), status: 'RELEASED_SINGLE', recordedWeek: 1 };
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null]) });
    expect(o.rehearsal?.songId).toBe('a');
  });

  it('applies member growth only when there is nothing to rehearse', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null]) });
    expect(o.rehearsal).toBeNull();
    expect(o.members[0].experience).toBeGreaterThan(0);
  });

  it('the writing slot does not also raise live mastery', () => {
    const s = band();
    s.songs.a = song('A', 60);
    const one = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', null, null], { newSong: true }) });
    expect(one.newSong).not.toBeNull();
    expect(one.rehearsal).toBeNull();
  });

  it('cannot target the song written in the same week (v1 규칙 5)', () => {
    const s = band();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['PRACTICE', 'PRACTICE', null], { newSong: true }) });
    expect(o.newSong).not.toBeNull();
    expect(o.rehearsal).toBeNull(); // the band had no other song yet
  });
});

describe('v1 규칙 3·4: recording turns a demo into a releasable master', () => {
  const plan = (actions: (MainActionId | null)[], songWork: Partial<SaveData['weeklyPlan']['songWork']> = {}): SaveData['weeklyPlan'] =>
    ({ mainActions: actions, individualActions: [], songWork: { ...EMPTY_SONG_WORK, ...songWork } });
  const withRoom = () => {
    const s = band();
    s.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    s.songs.a = song('A', 60);
    return s;
  };

  it('records the chosen demo and never writes a new song', () => {
    const s = withRoom();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'a' }) });
    expect(o.recording?.songId).toBe('a');
    expect(o.newSong).toBeNull();
  });

  it('does nothing and charges nothing without a target', () => {
    const s = withRoom();
    const idle = simulateWeek({ ...structuredClone(s), weeklyPlan: plan([null, null, null]) });
    const o = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['RECORDING', null, null]) });
    expect(o.recording).toBeNull();
    expect(o.expense).toBe(idle.expense);
  });

  it('charges the recording cost only when a demo was finished', () => {
    const s = withRoom();
    const idle = simulateWeek({ ...structuredClone(s), weeklyPlan: plan([null, null, null]) });
    const o = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'a' }) });
    const cost = ACTIVITIES.find((x) => x.scope === 'BAND' && x.id === 'RECORDING')!.cost ?? 0;
    expect(o.expense - idle.expense).toBe(cost);
  });

  it('costs nothing and tires nobody when it cannot run (명세 §4)', () => {
    const s = withRoom();
    const idle = simulateWeek({ ...structuredClone(s), weeklyPlan: plan([null, null, null]) });
    const dead = simulateWeek({ ...structuredClone(s), weeklyPlan: plan(['RECORDING', null, null]) });
    expect(dead.recording).toBeNull();
    expect(dead.expense).toBe(idle.expense);
    expect(dead.members[0].energy).toBe(0);
    expect(dead.members[0].stress).toBe(0);
    expect(dead.members[0].experience).toBe(0);
  });

  it('a real recording still tires the band', () => {
    const s = withRoom();
    const o = simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'a' }) });
    expect(o.members[0].energy).toBeLessThan(0);
    expect(o.members[0].experience).toBeGreaterThan(0);
  });

  it('rehearses and records different songs in the same week (명세 §6)', () => {
    const s = withRoom();
    s.songs.b = song('B', 60);
    const o = simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', 'PRACTICE', null], { recordingSongId: 'a', rehearsalSongId: 'b' }) });
    expect(o.recording?.songId).toBe('a');
    expect(o.rehearsal?.songId).toBe('b');
  });

  it('refuses without the recording room', () => {
    const s = band();
    s.songs.a = song('A', 60);
    const o = simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'a' }) });
    expect(o.recording).toBeNull();
  });

  it('refuses a song that is already recorded or released', () => {
    const s = withRoom();
    s.songs.a.recordedWeek = 2;
    s.songs.b = { ...song('B', 60), status: 'RELEASED_SINGLE' };
    expect(simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'a' }) }).recording).toBeNull();
    expect(simulateWeek({ ...s, weeklyPlan: plan(['RECORDING', null, null], { recordingSongId: 'b' }) }).recording).toBeNull();
  });

  it('marks an unrecorded song as not releasable', () => {
    const s = withRoom();
    expect(isRecorded(s.songs.a)).toBe(false);
    s.songs.a.recordedWeek = 3;
    expect(isRecorded(s.songs.a)).toBe(true);
  });
});

// 5 -------------------------------------------------------------- releases
describe('releases', () => {
  it('opens only after the first show (GDD 수익 해금 단계)', () => {
    const s = band();
    expect(unlockedRevenueStreams(s)).not.toContain('MUSIC');
    s.performanceHistory.push(snapshot());
    expect(unlockedRevenueStreams(s)).toContain('MUSIC');
  });

  it('pays weekly streaming income that decays and expires', () => {
    const s = band();
    s.songs.song_1 = song('A', 80);
    s.releases.rel_1 = { id: 'rel_1', type: 'SINGLE', songIds: ['song_1'], releasedWeek: 1 };
    s.world.week = 1;
    const w1 = weeklyMusicIncome(s);
    s.world.week = 4;
    const w4 = weeklyMusicIncome(s);
    s.world.week = 1 + B.release.weeklyIncomeWeeks + 2;
    const late = weeklyMusicIncome(s);
    expect(w1).toBeGreaterThan(0);
    expect(w4).toBeLessThan(w1);
    expect(late).toBe(0);
  });

  it('needs more songs for an EP than for a single', () => {
    expect(RELEASE_FORMATS.EP.songsRequired).toBeGreaterThan(RELEASE_FORMATS.SINGLE.songsRequired);
  });
});

// 6 -------------------------------------------------------------- repeat shows
describe('repeat live offers', () => {
  it('offers again after a show instead of only once', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.performanceHistory.push(snapshot());
    s.world.week = 5;
    const offers = buildLiveOffers(s, 5);
    expect(offers).toHaveLength(1);
    expect(offers[0].type).toBe('LIVE');
  });

  it('waits out the cooldown right after a show', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.performanceHistory.push({ ...snapshot(), week: 5 });
    expect(buildLiveOffers(s, 5)).toHaveLength(0);
  });

  it('moves to the bigger venue once the band has the fans', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.performanceHistory.push({ ...snapshot(), week: 1 });
    s.band.metrics.fans = B.liveOffer.moonlightClubFans + 20;
    const offers = buildLiveOffers(s, 6);
    expect(offers[0].payload?.venueId).toBe('MOONLIGHT_CLUB');
  });

  it('does not offer while a show is already booked', () => {
    const s = band();
    s.songs.a = song('A', 60); s.songs.b = song('B', 60);
    s.pendingPerformance = { opportunityId: 'x', venueId: 'BASEMENT_CLUB', openingSongId: null, status: 'SCHEDULED' };
    expect(buildLiveOffers(s, 9)).toHaveLength(0);
  });
});

// 6b ------------------------------------------------------------- show slot / promotion slots
describe('the live show slot is the show itself, not a decoration', () => {
  it('a booked but unplayed show costs nothing and tires nobody', () => {
    const s = band();
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: null, status: 'SCHEDULED' };
    const idle = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: [null, null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const booked = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['LIVE_SHOW', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    expect(booked.expense).toBe(idle.expense);
    expect(booked.members[0].energy).toBe(0);
    expect(booked.members[0].stress).toBe(0);
    expect(booked.members[0].experience).toBe(0);
  });

  it('is not previewed as an expense either', () => {
    const s = band();
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: null, status: 'SCHEDULED' };
    const empty = projectedExpense(s);
    s.weeklyPlan.mainActions = ['LIVE_SHOW', null, null];
    expect(projectedExpense(s)).toBe(empty);
  });

  it('replays the night that actually happened in the week summary', () => {
    const s = band();
    s.weeklyPlan.mainActions = ['LIVE_SHOW', null, null];
    s.performanceHistory.push({ ...snapshot(), week: s.world.week, venueName: 'Basement Club', audience: 88 });
    const o = simulateWeek(s);
    const entry = o.log.find((l) => l.title.includes('Basement Club'));
    expect(entry).toBeDefined();
    expect(entry!.effects.join(' ')).toContain('88');
  });

  it('says so when the stage was never taken', () => {
    const s = band();
    s.weeklyPlan.mainActions = ['LIVE_SHOW', null, null];
    const o = simulateWeek(s);
    expect(o.log.some((l) => l.body?.includes('무대에 오르지 않은'))).toBe(true);
  });
});

describe('promotion pays per slot', () => {
  it('scales fans with the number of promotion slots', () => {
    const s = band();
    const one = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const two = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', 'PROMOTION', null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const three = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', 'PROMOTION', 'PROMOTION'], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    expect(two.fansDelta).toBe(one.fansDelta * 2);
    expect(three.fansDelta).toBe(one.fansDelta * 3);
    expect(three.fanLoyaltyDelta).toBe(one.fanLoyaltyDelta * 3);
  });

  it('keeps the per-slot value unchanged', () => {
    const s = band();
    const one = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const starPower = (CHARACTERS.C01.visibleStats.star + CHARACTERS.C04.visibleStats.star) / 2;
    expect(one.fansDelta).toBe(Math.round(B.promotion.baseFans + starPower * B.promotion.starPowerFactor));
  });

  it('still costs and tires per slot', () => {
    const s = band();
    const one = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    const three = simulateWeek({ ...structuredClone(s), weeklyPlan: { mainActions: ['PROMOTION', 'PROMOTION', 'PROMOTION'], individualActions: [], songWork: { ...EMPTY_SONG_WORK } } });
    expect(three.members[0].stress).toBeCloseTo(one.members[0].stress * 3, 5);
  });
});

// 7 -------------------------------------------------------------- performance result
describe('performance result comes from band state', () => {
  it('rewards a stronger, better rested band', () => {
    const weak = band();
    weak.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: 'a', status: 'SCHEDULED' };
    weak.songs.a = song('A', 50, 30);
    weak.band.activeMembers.forEach((id) => { weak.characterStates[id]!.condition = { energy: 20, stress: 80, morale: 30 }; });

    const strong = structuredClone(weak);
    strong.songs.a = song('A', 50, 95);
    strong.band.activeMembers.forEach((id) => {
      strong.characterStates[id]!.condition = { energy: 95, stress: 10, morale: 95 };
      strong.characterStates[id]!.currentStats = { skill: 95, stage: 95 };
    });

    expect(resolvePerformance(strong, 1).score).toBeGreaterThan(resolvePerformance(weak, 0).score);
  });

  it('is not decided by the moment choice alone', () => {
    const s = band();
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: 'a', status: 'SCHEDULED' };
    s.songs.a = song('A', 50, 60);
    const low = resolvePerformance(s, 0).score;
    const high = resolvePerformance(s, 1).score;
    expect(high - low).toBeLessThanOrEqual(B.performanceScore.choiceBonusMax + 0.01);
    expect(low).toBeGreaterThan(0);
  });

  it('reads preparedness from member condition', () => {
    const s = band();
    s.band.activeMembers.forEach((id) => { s.characterStates[id]!.condition = { energy: 100, stress: 0, morale: 100 }; });
    const rested = preparedness(s);
    s.band.activeMembers.forEach((id) => { s.characterStates[id]!.condition = { energy: 10, stress: 90, morale: 10 }; });
    expect(preparedness(s)).toBeLessThan(rested);
  });

  it('grades on the documented thresholds', () => {
    expect(gradeOf(95)).toBe('GREAT SHOW');
    expect(gradeOf(70)).toBe('GOOD SHOW');
    expect(gradeOf(50)).toBe('OKAY');
    expect(gradeOf(10)).toBe('DISASTER');
    expect(scoreOf({ skill: 100, stagePresence: 100, songLiveFit: 100, condition: 100, liveStability: 100, choiceBonus: 0, random: 0 })).toBeCloseTo(100);
  });
});

// 8 -------------------------------------------------------------- career + unlocks
describe('career progression and facility unlocks', () => {
  it('derives milestones from history', () => {
    const s = band();
    expect(achievedMilestones(s).size).toBe(0);
    s.performanceHistory.push(snapshot());
    expect(achievedMilestones(s).has('FIRST_SHOW')).toBe(true);
    s.performanceHistory.push({ ...snapshot(), audience: VENUES.BASEMENT_CLUB.capacity });
    expect(achievedMilestones(s).has('FIRST_SELLOUT')).toBe(true);
    s.band.metrics.fans = B.career.localFanbaseFans;
    expect(achievedMilestones(s).has('LOCAL_FANBASE')).toBe(true);
  });

  it('advances to Local Act on the three things GDD lists for that tier', () => {
    const s = band();
    expect(careerTierFor(s)).toBe('UNKNOWN');
    s.performanceHistory.push({ ...snapshot(), audience: VENUES.BASEMENT_CLUB.capacity });
    s.band.metrics.fans = B.career.localFanbaseFans;
    expect(careerTierFor(s)).toBe('UNKNOWN'); // facility still missing
    s.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    expect(careerTierFor(s)).toBe('LOCAL_ACT');
  });

  it('keeps the recording room gated behind the first show, as before', () => {
    const s = band();
    expect(facilityAvailabilityFor(s, 'RECORDING_ROOM')).toBe('LOCKED');
    s.performanceHistory.push(snapshot());
    expect(facilityAvailabilityFor(s, 'RECORDING_ROOM')).toBe('AVAILABLE');
    s.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    expect(facilityAvailabilityFor(s, 'RECORDING_ROOM')).toBe('BUILT');
  });

  it('opens the lounge and office at Local Act', () => {
    const s = band();
    expect(facilityAvailabilityFor(s, 'LOUNGE')).toBe('LOCKED');
    s.performanceHistory.push({ ...snapshot(), audience: VENUES.BASEMENT_CLUB.capacity });
    s.band.metrics.fans = B.career.localFanbaseFans;
    s.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    expect(facilityAvailabilityFor(s, 'LOUNGE')).toBe('AVAILABLE');
    expect(facilityAvailabilityFor(s, 'OFFICE')).toBe('AVAILABLE');
    expect(facilityAvailabilityFor(s, 'STYLING_ROOM')).toBe('LOCKED');
  });

  it('gates recording on the recording room', () => {
    const s = band();
    expect(activityUnlocked(s, 'RECORDING')).toBe(false);
    expect(activityUnlocked(s, 'PRACTICE')).toBe(true);
    s.facilities.RECORDING_ROOM = { facilityId: 'RECORDING_ROOM', level: 1, built: true };
    expect(activityUnlocked(s, 'RECORDING')).toBe(true);
  });
});

// ---------------------------------------------------------------- helpers
function song(title: string, popularity: number, liveFit = 50): SaveData['songs'][string] {
  // the map key the tests use is the lowercased title, so keep id and key in step
  return {
    id: title.toLowerCase(), title, createdWeek: 1,
    contributors: { composer: ['C01'], lyrics: ['C01'] },
    originContext: ['BAND_PRACTICE'],
    musicProfile: { popularity, artistry: 50, fanFit: 50, liveFit },
    genreTags: ['Pop Rock'], status: 'UNRELEASED',
  };
}

function snapshot(): SaveData['performanceHistory'][number] {
  return {
    id: 'perf_1', week: 1, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
    lineup: [], openingSongTitle: 'A', audience: 40, grade: 'GOOD SHOW',
    revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
  };
}
