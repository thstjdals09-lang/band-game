// 함께 선 무대 계산 (PHASE 2B-1). 기록을 읽기만 하고 어떤 값도 바꾸지 않는다.
import { describe, expect, it } from 'vitest';

import type { CharacterId, SlotId } from '@/data/master';
import type { PerformanceSnapshot } from '@/state/save/schema';
import { sharedPerformances } from './performance';

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
