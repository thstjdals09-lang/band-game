// 함께 선 무대 계산 (PHASE 2B-1). 기록을 읽기만 하고 어떤 값도 바꾸지 않는다.
import { describe, expect, it } from 'vitest';

import type { CharacterId, SlotId } from '@/data/master';
import type { PerformanceSnapshot } from '@/state/save/schema';
import { createNewGame } from '@/state/save/newGame';
import type { SaveData } from '@/state/save/schema';
import { PROTOTYPE_BALANCE } from '@/data/master';
import {
  liveFamiliarity, pairFamiliarity, performanceInputs, resolvePerformance, scoreOf, sharedPerformances,
} from './performance';

/** 실제 저장 경로가 만드는 모양의 공연 기록. entries = 그 공연의 라인업 칸. */
function show(
  id: string,
  entries: { slot: SlotId; characterId: CharacterId | null }[],
  absoluteWeek = 1,
): PerformanceSnapshot {
  return {
    id,
    week: absoluteWeek,
    absoluteWeek,
    venueId: 'BASEMENT_CLUB',
    venueName: 'Basement Club',
    lineup: entries.map((e) => ({ slot: e.slot, label: '', characterId: e.characterId })),
    openingSongTitle: 'A',
    audience: 50,
    grade: 'GOOD SHOW',
    revenue: 1,
    fansDelta: 1,
    reputationDelta: 1,
    crowdEnergyPeak: 50,
    choices: [],
  };
}
/** characterId를 기록하기 전 시절의 공연 기록. */
function legacyShow(id: string, labels: string[]): PerformanceSnapshot {
  return {
    ...show(id, []),
    lineup: labels.map((label) => ({ slot: 'VOCAL' as SlotId, label })),
  };
}
const member = (slot: SlotId, characterId: CharacterId) => ({ slot, characterId });
const session = (slot: SlotId) => ({ slot, characterId: null });

describe('함께 선 무대를 센다', () => {
  it('1 · 한 무대에 함께 서면 1회다', () => {
    const history = [show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')])];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(1);
  });

  it('2 · 여러 무대에 함께 서면 그만큼 쌓인다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 1),
      show('p2', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 5),
      show('p3', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 9),
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(3);
  });

  it('3 · 한쪽만 선 무대는 세지 않는다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 1),
      show('p2', [member('VOCAL', 'C01')], 2),                        // C04 결장
      show('p3', [member('GUITAR', 'C04')], 3),                       // C01 결장
      show('p4', [member('VOCAL', 'C02'), member('BASS', 'C07')], 4), // 둘 다 없음
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(1);
  });

  it('4 · 사이에 포지션이 바뀌어도 함께 선 기록은 그대로다', () => {
    // C02는 Vocal / Keys 둘 다 가능하다. 칸이 달라져도 함께 선 사실은 같다.
    const history = [
      show('p1', [member('VOCAL', 'C02'), member('GUITAR', 'C04')], 1),
      show('p2', [member('KEYS', 'C02'), member('GUITAR', 'C04')], 6),
    ];
    expect(sharedPerformances(history, 'C02', 'C04')).toBe(2);
  });

  it('5 · 사이에 재계약이 있어도 지난 기록이 사라지지 않는다', () => {
    // 계약이 52주에 끝나고 53주부터 새 계약이 시작해도 기록은 계약과 무관하다.
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 40),  // 이전 계약 기간
      show('p2', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 60),  // 재계약 이후
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(2);
  });

  it('6 · 떠났다가 돌아와도 예전 기록이 이어진다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 10),
      show('p2', [member('VOCAL', 'C01'), session('GUITAR')], 30),        // C04가 없던 시기
      show('p3', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 70),  // 복귀 후
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(2);
  });

  it('7 · 같은 무대의 세션은 세지 않는다', () => {
    const history = [show('p1', [member('VOCAL', 'C01'), session('GUITAR'), session('BASS')])];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(0);
  });

  it('8 · 출전자를 알 수 없는 과거 기록은 건너뛴다', () => {
    const history = [
      legacyShow('p0', ['윤하진', '민채린']),                              // 이름만 남은 기록
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 2),
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(1);
    // 기록이 전부 구형이면 0이다 (지어내지 않는다)
    expect(sharedPerformances([legacyShow('p0', ['윤하진', '민채린'])], 'C01', 'C04')).toBe(0);
  });

  it('9 · 한 공연에 같은 사람이 여러 칸에 적혀 있어도 1회다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('KEYS', 'C01'), member('GUITAR', 'C04')]),
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(1);
  });

  it('9b · 같은 공연 기록이 중복 저장돼도 1회다', () => {
    const snap = show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')]);
    expect(sharedPerformances([snap, { ...snap }], 'C01', 'C04')).toBe(1);
  });

  it('10 · 두 사람의 순서를 바꿔도 결과가 같다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 1),
      show('p2', [member('VOCAL', 'C01')], 2),
      show('p3', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 3),
    ];
    expect(sharedPerformances(history, 'C01', 'C04')).toBe(sharedPerformances(history, 'C04', 'C01'));
    expect(sharedPerformances(history, 'C04', 'C01')).toBe(2);
  });

  it('11 · 같은 사람을 두 번 넣으면 0이다', () => {
    const history = [show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')])];
    expect(sharedPerformances(history, 'C01', 'C01')).toBe(0);
  });

  it('12 · 입력을 바꾸지 않는다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 1),
      show('p2', [member('VOCAL', 'C01'), session('GUITAR')], 2),
    ];
    const before = JSON.stringify(history);
    sharedPerformances(history, 'C01', 'C04');
    sharedPerformances(history, 'C04', 'C01');
    expect(JSON.stringify(history)).toBe(before);
  });

  it('기록이 없으면 0이다', () => {
    expect(sharedPerformances([], 'C01', 'C04')).toBe(0);
  });

  it('같은 기록에 대해 몇 번을 물어도 같은 값이 나온다', () => {
    const history = [
      show('p1', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 1),
      show('p2', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 2),
    ];
    const runs = [0, 1, 2, 3].map(() => sharedPerformances(history, 'C01', 'C04'));
    expect(new Set(runs).size).toBe(1);
    expect(runs[0]).toBe(2);
  });
});

// ---------------------------------------------------------------- 라이브 호흡 (Phase 2B-1 V1)
const F = PROTOTYPE_BALANCE.familiarity;

/** 무대에 세울 사람들. CharacterId는 고정 캐릭터, null은 익명 세션. */
function stage(save: SaveData, roster: (CharacterId | null)[]): SaveData {
  const slots: SlotId[] = ['VOCAL', 'GUITAR', 'BASS', 'DRUMS', 'KEYS'];
  save.band.lineup = roster.map((id, i) => ({
    slotId: slots[i % slots.length],
    assignment: id ? { kind: 'MEMBER' as const, characterId: id } : { kind: 'SESSION' as const, instanceId: `sess_${i}` },
  }));
  save.band.activeMembers = roster.filter((x): x is CharacterId => !!x);
  return save;
}
/** 주어진 멤버들이 함께 끝낸 공연을 n회 기록한다. */
function playedTogether(save: SaveData, members: CharacterId[], n: number): SaveData {
  for (let i = 0; i < n; i += 1) {
    save.performanceHistory.push(show(`hist_${members.join('')}_${i}`, members.map((id) => member('VOCAL', id)), i + 1));
  }
  return save;
}

describe('쌍의 호흡 곡선', () => {
  it('n / (n + 3)을 따른다', () => {
    expect(F.softness).toBe(3);
    expect(pairFamiliarity(0)).toBe(0);
    expect(pairFamiliarity(1)).toBeCloseTo(0.25);
    expect(pairFamiliarity(3)).toBeCloseTo(0.5);
    expect(pairFamiliarity(6)).toBeCloseTo(2 / 3);
    expect(pairFamiliarity(9)).toBeCloseTo(0.75);
    expect(pairFamiliarity(15)).toBeCloseTo(5 / 6);
  });

  it('초반에 빠르게 오르고 뒤로 갈수록 완만해지며 1에 닿지 않는다', () => {
    const early = pairFamiliarity(3) - pairFamiliarity(0);
    const late = pairFamiliarity(18) - pairFamiliarity(15);
    expect(early).toBeGreaterThan(late);
    expect(pairFamiliarity(10_000)).toBeLessThan(1);
  });
});

describe('라인업 호흡과 점수 보너스', () => {
  it('공동 공연 이력이 없으면 보너스 0', () => {
    const s = stage(createNewGame('T'), ['C01', 'C04', 'C07', 'C10']);
    const f = liveFamiliarity(s);
    expect(f.pairs).toBe(6);
    expect(f.value).toBe(0);
    expect(f.bonus).toBe(0);
  });

  it('4명 전원 공동 공연 3회 -> 호흡 50%, 보너스 +2', () => {
    const roster: CharacterId[] = ['C01', 'C04', 'C07', 'C10'];
    const s = playedTogether(stage(createNewGame('T'), roster), roster, 3);
    const f = liveFamiliarity(s);
    expect(f.performers).toBe(4);
    expect(f.pairs).toBe(6);
    expect(f.value).toBeCloseTo(0.5);
    expect(f.bonus).toBeCloseTo(2);
  });

  it('4명 전원 공동 공연 9회 -> 호흡 75%, 보너스 +3', () => {
    const roster: CharacterId[] = ['C01', 'C04', 'C07', 'C10'];
    const s = playedTogether(stage(createNewGame('T'), roster), roster, 9);
    const f = liveFamiliarity(s);
    expect(f.value).toBeCloseTo(0.75);
    expect(f.bonus).toBeCloseTo(3);
  });

  it('1명을 경험 없는 캐릭터로 교체 -> 기존 3쌍 유지, 신규 3쌍 0. 호흡 37.5%, 보너스 +1.5', () => {
    const old: CharacterId[] = ['C01', 'C04', 'C07', 'C10'];
    const s = playedTogether(createNewGame('T'), old, 9);
    stage(s, ['C01', 'C04', 'C07', 'C12']); // C10 -> C12 (공동 경험 없음)
    const f = liveFamiliarity(s);
    expect(f.pairs).toBe(6);
    expect(f.value).toBeCloseTo(0.375);
    expect(f.bonus).toBeCloseTo(1.5);
    // 교체되지 않은 멤버들 사이의 경험은 그대로다
    expect(sharedPerformances(s.performanceHistory, 'C01', 'C04')).toBe(9);
    expect(sharedPerformances(s.performanceHistory, 'C01', 'C12')).toBe(0);
  });

  it('고정 2명(공동 9회) + 일반 세션 2명 -> 6쌍 중 1쌍만 기여. 호흡 12.5%, 보너스 +0.5', () => {
    const s = playedTogether(createNewGame('T'), ['C01', 'C04'], 9);
    stage(s, ['C01', 'C04', null, null]);
    const f = liveFamiliarity(s);
    expect(f.performers).toBe(4);
    expect(f.pairs).toBe(6);
    expect(f.value).toBeCloseTo(0.125);
    expect(f.bonus).toBeCloseTo(0.5);
  });

  it('출전자가 0명 또는 1명이면 오류 없이 0', () => {
    const empty = stage(createNewGame('T'), []);
    expect(liveFamiliarity(empty)).toEqual({ performers: 0, pairs: 0, value: 0, bonus: 0 });
    const solo = playedTogether(stage(createNewGame('T'), ['C01']), ['C01'], 5);
    const f = liveFamiliarity(solo);
    expect(f.performers).toBe(1);
    expect(f.pairs).toBe(0);
    expect(f.bonus).toBe(0);
  });

  it('과거에 함께 선 멤버가 돌아오면 그 경험을 다시 쓴다', () => {
    const s = playedTogether(createNewGame('T'), ['C01', 'C04'], 3);
    // 한동안 세션으로 대체했다가
    stage(s, ['C01', null]);
    expect(liveFamiliarity(s).value).toBe(0);
    // 복귀시키면 예전 경험이 그대로 살아난다
    stage(s, ['C01', 'C04']);
    expect(liveFamiliarity(s).value).toBeCloseTo(0.5);
    expect(liveFamiliarity(s).bonus).toBeCloseTo(2);
  });

  it('같은 고정 캐릭터가 중복 배치돼도 한 사람으로 센다', () => {
    const s = playedTogether(createNewGame('T'), ['C01', 'C04'], 3);
    s.band.lineup = [
      { slotId: 'VOCAL', assignment: { kind: 'MEMBER', characterId: 'C01' } },
      { slotId: 'KEYS', assignment: { kind: 'MEMBER', characterId: 'C01' } }, // 잘못된 중복 배치
      { slotId: 'GUITAR', assignment: { kind: 'MEMBER', characterId: 'C04' } },
    ];
    const f = liveFamiliarity(s);
    expect(f.performers).toBe(2);
    expect(f.pairs).toBe(1);
    expect(f.value).toBeCloseTo(0.5);
  });

  it('빈 슬롯과 대기 멤버는 분모에 들어가지 않는다', () => {
    const s = playedTogether(createNewGame('T'), ['C01', 'C04'], 3);
    s.band.activeMembers = ['C01', 'C04', 'C07']; // C07은 계약만 되어 있고 무대에는 없다
    s.band.lineup = [
      { slotId: 'VOCAL', assignment: { kind: 'MEMBER', characterId: 'C01' } },
      { slotId: 'GUITAR', assignment: { kind: 'MEMBER', characterId: 'C04' } },
      { slotId: 'BASS', assignment: null },
      { slotId: 'DRUMS', assignment: null },
    ];
    const f = liveFamiliarity(s);
    expect(f.performers).toBe(2);
    expect(f.pairs).toBe(1);
    expect(f.bonus).toBeCloseTo(2);
  });
});

describe('점수 연결', () => {
  function bookedShow(roster: (CharacterId | null)[], history: number): SaveData {
    const fixed = roster.filter((x): x is CharacterId => !!x);
    const s = playedTogether(createNewGame('T'), fixed, history);
    stage(s, roster);
    s.songs.s1 = {
      id: 's1', title: 'A', createdWeek: 1, contributors: { composer: [], lyrics: [] },
      originContext: [], musicProfile: { popularity: 50, artistry: 50, fanFit: 50, liveFit: 50 },
      genreTags: [], status: 'UNRELEASED', recordedWeek: null, rehearsalCount: 0,
    };
    s.pendingPerformance = { opportunityId: 'o', venueId: 'BASEMENT_CLUB', openingSongId: 's1', status: 'SCHEDULED' };
    return s;
  }

  it('보너스가 점수에 더해지고 상한 100을 넘지 않는다', () => {
    const i = {
      skill: 100, stagePresence: 100, songLiveFit: 100, condition: 100, liveStability: 100,
      choiceBonus: 0, familiarityBonus: 0, random: 0,
    };
    expect(scoreOf(i)).toBeCloseTo(100);
    expect(scoreOf({ ...i, familiarityBonus: F.maxBonus })).toBe(100); // 상한 유지
    const mid = { ...i, skill: 50, stagePresence: 50, songLiveFit: 50, condition: 50, liveStability: 50 };
    expect(scoreOf({ ...mid, familiarityBonus: 2 }) - scoreOf(mid)).toBeCloseTo(2);
  });

  it('준비 화면과 실제 결과가 같은 호흡 값을 쓴다', () => {
    const s = bookedShow(['C01', 'C04', 'C07', 'C10'], 3);
    const shown = liveFamiliarity(s);
    const used = performanceInputs(s, 0, 0).familiarityBonus;
    expect(used).toBeCloseTo(shown.bonus);
    expect(resolvePerformance(s, 0).inputs.familiarityBonus).toBeCloseTo(shown.bonus);
  });

  it('호흡이 0이면 기존 공연 결과와 같다', () => {
    const s = bookedShow(['C01', 'C04'], 0);
    const r = resolvePerformance(s, 0);
    const i = r.inputs;
    const base = i.skill * PROTOTYPE_BALANCE.performanceScore.skill
      + i.stagePresence * PROTOTYPE_BALANCE.performanceScore.stagePresence
      + i.songLiveFit * PROTOTYPE_BALANCE.performanceScore.songLiveFit
      + i.condition * PROTOTYPE_BALANCE.performanceScore.condition
      + i.liveStability * PROTOTYPE_BALANCE.performanceScore.liveStability;
    expect(i.familiarityBonus).toBe(0);
    expect(r.score).toBeCloseTo(Math.max(0, Math.min(100, base + i.choiceBonus + i.random)));
  });

  it('호흡을 연결해도 난수 흐름이 달라지지 않는다', () => {
    const withHistory = bookedShow(['C01', 'C04'], 9);
    const without = bookedShow(['C01', 'C04'], 0);
    without.rng = { ...withHistory.rng, streams: { ...withHistory.rng.streams } }; // 같은 시드에서 비교
    // 같은 rng 위치에서 같은 난수를 쓴다 (호흡은 난수를 소비하지 않는다)
    expect(resolvePerformance(withHistory, 0).inputs.random)
      .toBe(resolvePerformance(without, 0).inputs.random);
    // 호출해도 rng 스트림 위치는 그대로다
    const before = withHistory.rng.streams.performance;
    resolvePerformance(withHistory, 0);
    liveFamiliarity(withHistory);
    expect(withHistory.rng.streams.performance).toBe(before);
  });

  it('이번 공연은 이번 결과에 미리 반영되지 않고, 다음 공연부터 반영된다', () => {
    const s = bookedShow(['C01', 'C04'], 0);
    expect(liveFamiliarity(s).bonus).toBe(0);            // 첫 공동 공연: 보너스 0
    // 이 공연이 끝나 기록으로 남으면
    s.performanceHistory.push(show('first', [member('VOCAL', 'C01'), member('GUITAR', 'C04')], 2));
    expect(sharedPerformances(s.performanceHistory, 'C01', 'C04')).toBe(1);
    expect(liveFamiliarity(s).value).toBeCloseTo(0.25);  // 다음 공연부터 n = 1
  });

  it('계산은 세이브를 건드리지 않는다', () => {
    const s = bookedShow(['C01', 'C04', 'C07'], 4);
    const before = JSON.stringify(s);
    liveFamiliarity(s);
    performanceInputs(s, 0, 0);
    expect(JSON.stringify(s)).toBe(before);
  });
});
