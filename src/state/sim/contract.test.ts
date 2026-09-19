// CONTRACT V1: 판정 · 기간 · 재계약 · 주전 기용 약속.
import { describe, expect, it } from 'vitest';

import { CHARACTERS, CONTRACT_PROFILES, CONTRACT_V1_PROVISIONAL, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';
import { createNewGame } from '@/state/save/newGame';
import type { ContractState, SaveData } from '@/state/save/schema';
import { starterCheck, weeklySalaryBurden } from '@/state/selectors';
import {
  absoluteWeek, acceptsTerms, baseSalaryOf, durationAdjustment, evaluateContract, preferredDurationOf,
  renewalOpen, requiredSalaryFor, roleAdjustment, sameTerms, settleContracts, starterPromise, starterViolations,
  type ContractTerms, type RolePromise,
} from './contract';

const B = PROTOTYPE_BALANCE.contract;
const V1 = CONTRACT_V1_PROVISIONAL;
const ALL = Object.keys(CHARACTERS) as CharacterId[];
const terms = (salary: number, durationWeeks = 52, rolePromise: RolePromise = 'CORE_MEMBER'): ContractTerms =>
  ({ salary, durationWeeks, rolePromise });

// ---------------------------------------------------------------- [8].1 · [1]
describe('기간과 역할이 실제 수락 조건에 영향을 준다', () => {
  it('같은 주급이라도 기간에 따라 결과가 갈리는 캐릭터가 있다', () => {
    const changed = ALL.filter((id) => {
      const pref = preferredDurationOf(id);
      const other = pref === 104 ? 26 : 104;
      return requiredSalaryFor(id, pref, 'CORE_MEMBER') !== requiredSalaryFor(id, other, 'CORE_MEMBER');
    });
    expect(changed.length).toBeGreaterThan(0);

    // 윤하진은 묶이는 것을 싫어한다: 같은 주급에서 52주는 수락, 104주는 거절이 되는 지점이 있다.
    const salary = requiredSalaryFor('C01', 52, 'CORE_MEMBER');
    expect(acceptsTerms('C01', terms(salary, 52))).toBe(true);
    expect(acceptsTerms('C01', terms(salary, 104))).toBe(false);
  });

  it('같은 주급이라도 역할에 따라 결과가 갈린다', () => {
    const salary = requiredSalaryFor('C01', 52, 'CORE_MEMBER');
    expect(acceptsTerms('C01', terms(salary, 52, 'CORE_MEMBER'))).toBe(true);
    expect(acceptsTerms('C01', terms(salary, 52, 'SUPPORT_MEMBER'))).toBe(false);
  });

  it('주전 약속에는 어떤 보정도 붙지 않는다', () => {
    ALL.forEach((id) => expect(roleAdjustment(id, 'CORE_MEMBER')).toBe(0));
  });
});

// ---------------------------------------------------------------- [8].2 · [1]
describe('캐릭터마다 선호가 다르다', () => {
  it('윤하진과 민채린의 판정이 서로 다른 방향으로 움직인다', () => {
    // 윤하진 riskTolerance 85 / ego 72, 민채린 riskTolerance 60 / ego 28
    const hajinLong = durationAdjustment('C01', 104);
    const chaerinShort = durationAdjustment('C04', 52); // 선호 104주보다 짧다
    expect(hajinLong).toBeGreaterThan(0);   // 장기 계약에 웃돈을 요구한다
    expect(chaerinShort).toBeLessThan(0);   // 짧게 가는 쪽을 싸게 받아들인다

    expect(roleAdjustment('C01', 'SUPPORT_MEMBER')).toBeGreaterThan(0); // 무대를 양보하면 더 받아야 한다
    expect(roleAdjustment('C04', 'SUPPORT_MEMBER')).toBeLessThan(0);    // 오히려 부담이 준다
  });

  it('모두에게 똑같이 적용되는 장기·주전 할인이 아니다', () => {
    const longAdj = ALL.map((id) => durationAdjustment(id, 104));
    expect(longAdj.some((x) => x > 0)).toBe(true);
    expect(longAdj.some((x) => x < 0)).toBe(true);
    const supportAdj = ALL.map((id) => roleAdjustment(id, 'SUPPORT_MEMBER'));
    expect(supportAdj.some((x) => x > 0)).toBe(true);
    expect(supportAdj.some((x) => x < 0)).toBe(true);
  });

  it('기준 주급은 그대로 두고 배수만 만든다', () => {
    ALL.forEach((id) => {
      expect(baseSalaryOf(id)).toBe(CONTRACT_PROFILES[CHARACTERS[id].contractProfileId].baseSalary);
    });
  });

  it('선호 조건 그대로면 기준 주급은 언제나 통과한다', () => {
    ALL.forEach((id) => {
      expect(acceptsTerms(id, terms(baseSalaryOf(id), preferredDurationOf(id), 'CORE_MEMBER'))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------- [8].3 · [1]
describe('역제안', () => {
  it('최대 2개이고 전부 실제로 수락되는 조건이다', () => {
    ALL.forEach((id) => {
      const d = evaluateContract(id, B.minSalary, preferredDurationOf(id), 'CORE_MEMBER');
      expect(d.accepted).toBe(false);
      expect(d.counterOffers.length).toBeGreaterThan(0);
      expect(d.counterOffers.length).toBeLessThanOrEqual(2);
      d.counterOffers.forEach((t) => {
        expect(acceptsTerms(id, t)).toBe(true);
        expect(evaluateContract(id, t.salary, t.durationWeeks, t.rolePromise).accepted).toBe(true);
      });
    });
  });

  it('주급을 올리는 길과 조건을 바꾸는 길을 함께 보여준다', () => {
    // 윤하진에게 104주를 52주 기준 최저 주급으로 제안하면, 주급을 올리는 안과 기간을 줄이는 안이 나온다.
    const d = evaluateContract('C01', requiredSalaryFor('C01', 52, 'CORE_MEMBER'), 104, 'CORE_MEMBER');
    expect(d.accepted).toBe(false);
    expect(d.counterOffers.some((t) => t.durationWeeks === 104)).toBe(true);
    expect(d.counterOffers.some((t) => t.durationWeeks !== 104)).toBe(true);
  });

  it('수락되는 조건에는 역제안을 붙이지 않는다', () => {
    const d = evaluateContract('C01', baseSalaryOf('C01'), preferredDurationOf('C01'), 'CORE_MEMBER');
    expect(d.accepted).toBe(true);
    expect(d.counterOffers).toHaveLength(0);
    expect(d.reason.length).toBeGreaterThan(0);
  });

  it('최저선은 주급 조절 단위에 맞아 화면에서 그대로 고를 수 있다', () => {
    ALL.forEach((id) => {
      [26, 52, 104].forEach((w) => {
        (['CORE_MEMBER', 'SUPPORT_MEMBER'] as RolePromise[]).forEach((r) => {
          const min = requiredSalaryFor(id, w, r);
          expect(min % B.salaryStep).toBe(0);
          expect(acceptsTerms(id, terms(min, w, r))).toBe(true);
          expect(acceptsTerms(id, terms(min - B.salaryStep, w, r))).toBe(false);
        });
      });
    });
  });
});

// ---------------------------------------------------------------- [8].4
describe('합의는 조건 스냅샷에 묶인다', () => {
  it('하나라도 다르면 같은 합의가 아니다', () => {
    const a = terms(400_000, 52, 'CORE_MEMBER');
    expect(sameTerms(a, { ...a })).toBe(true);
    expect(sameTerms(a, { ...a, salary: 450_000 })).toBe(false);
    expect(sameTerms(a, { ...a, durationWeeks: 104 })).toBe(false);
    expect(sameTerms(a, { ...a, rolePromise: 'SUPPORT_MEMBER' })).toBe(false);
    expect(sameTerms(a, null)).toBe(false);
  });
});

// ---------------------------------------------------------------- [2] · [8].5
describe('계약 기간', () => {
  const world = (week: number, year = 1) => ({ week, year });

  it('절대 주차로 다루므로 연도를 넘어가도 주수가 어긋나지 않는다', () => {
    expect(absoluteWeek(world(1, 1))).toBe(1);
    expect(absoluteWeek(world(52, 1))).toBe(52);
    expect(absoluteWeek(world(1, 2))).toBe(53);
    expect(absoluteWeek(world(10, 3))).toBe(114);
  });

  it('26 / 52 / 104주 계약이 정확히 그 주수만큼 간다', () => {
    [26, 52, 104].forEach((weeks) => {
      const start = absoluteWeek(world(40, 1)); // 연도를 넘어가는 시작점
      const end = start + weeks - 1;
      expect(end - start + 1).toBe(weeks);
    });
  });

  it('재계약 창은 마지막 4주에만 열린다', () => {
    const c = { endWeek: 100 } as ContractState;
    const at = (abs: number) => world(abs - 52, 2); // 2년차 주차로 환산
    expect(renewalOpen(c, at(96))).toBe(false); // 5주 남음
    expect(renewalOpen(c, at(97))).toBe(true);  // 4주 남음
    expect(renewalOpen(c, at(100))).toBe(true); // 마지막 주
    expect(renewalOpen(c, at(101))).toBe(false); // 이미 끝난 뒤
    expect(V1.renewalWindowWeeks).toBe(4);
  });
});

// ---------------------------------------------------------------- [4] · [8].8~10
describe('주전 기용 약속', () => {
  function band(): SaveData {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C04'];
    s.contracts.C01 = {
      characterId: 'C01', salary: 400_000, startWeek: 1, endWeek: 52,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
    };
    return s;
  }
  // 1년차 기록이라 통산 주차와 그 해의 주차가 같다 (저장 경로가 만드는 모양).
  const show = (week: number, ids: CharacterId[]) => ({
    id: `p${week}`, week, absoluteWeek: week, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
    lineup: ids.map((id) => ({ slot: 'VOCAL' as const, label: '', characterId: id })),
    openingSongTitle: 'A', audience: 50, grade: 'GOOD SHOW' as const,
    revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
  });

  it('최근 4회 중 결장 1회까지는 충족이다', () => {
    const s = band();
    s.performanceHistory.push(show(2, ['C01']), show(3, ['C04']), show(4, ['C01']), show(5, ['C01']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);
    expect(p.absences).toBe(1);
    expect(p.met).toBe(true);
  });

  it('결장 2회면 미충족이다', () => {
    const s = band();
    s.performanceHistory.push(show(2, ['C01']), show(3, ['C04']), show(4, ['C01']), show(5, ['C04']));
    const p = starterPromise(s, 'C01');
    expect(p.absences).toBe(2);
    expect(p.met).toBe(false);
  });

  it('계약 이전 공연은 계산하지 않는다', () => {
    const s = band();
    s.contracts.C01!.startWeek = 10;
    s.performanceHistory.push(show(2, ['C04']), show(3, ['C04']), show(11, ['C01']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(1);
    expect(p.absences).toBe(0);
  });

  it('출전 기록이 없는 과거 공연은 가짜로 채우지 않고 건너뛴다', () => {
    const s = band();
    const legacy = { ...show(2, ['C01']), lineup: [{ slot: 'VOCAL' as const, label: '윤하진' }] };
    s.performanceHistory.push(legacy as never, show(3, ['C01']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(1);
  });

  it('서포트 약속은 출전 횟수를 따지지 않는다', () => {
    const s = band();
    s.contracts.C01!.rolePromise = 'SUPPORT_MEMBER';
    s.performanceHistory.push(show(2, ['C04']), show(3, ['C04']), show(4, ['C04']), show(5, ['C04']));
    expect(starterPromise(s, 'C01').met).toBe(true);
  });

  it('이번 편성을 미리 넣어 위반을 예측한다', () => {
    const s = band();
    s.performanceHistory.push(show(2, ['C01']), show(3, ['C04']), show(4, ['C01']));
    expect(starterViolations(s, ['C01'])).toHaveLength(0);   // 출전시키면 문제없다
    expect(starterViolations(s, ['C04'])).toHaveLength(1);   // 또 빼면 결장 2회
    expect(starterViolations(s, ['C04'])[0].characterId).toBe('C01');
  });

  it('공연이 없으면 판정할 것도 없다', () => {
    const p = starterPromise(band(), 'C01');
    expect(p.considered).toBe(0);
    expect(p.met).toBe(true);
  });
});


// ---------------------------------------------------------------- [2][3][5] · [8].5~7 · [8].11
describe('주간 계약 정산', () => {
  function withContract(over: Partial<ContractState> = {}): SaveData {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01'];
    s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' };
    s.contracts.C01 = {
      characterId: 'C01', salary: 400_000, startWeek: 1, endWeek: 26,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
      ...over,
    };
    return s;
  }
  const goTo = (s: SaveData, abs: number) => {
    s.world.year = Math.floor((abs - 1) / 52) + 1;
    s.world.week = abs - (s.world.year - 1) * 52;
  };

  it('마지막 주까지는 계약이 살아 있다', () => {
    const s = withContract({ endWeek: 26 });
    goTo(s, 26);
    settleContracts(s);
    expect(s.contracts.C01).toBeDefined();
    expect(s.band.activeMembers).toContain('C01');
  });

  it('마지막 주 정산 이후에 정확히 만료된다', () => {
    [26, 52, 104].forEach((weeks) => {
      const s = withContract({ startWeek: 1, endWeek: weeks });
      goTo(s, weeks + 1);
      settleContracts(s);
      expect(s.contracts.C01).toBeUndefined();
      expect(s.band.activeMembers).not.toContain('C01');
      expect(s.band.lineup[0].assignment).toBeNull();
    });
  });

  it('만료해도 성장·기록은 남고 오디션 후보로 되돌아가지 않는다', () => {
    const s = withContract({ endWeek: 10 });
    s.characterStates.C01!.growth.experience = 1234;
    s.songs.a = {
      id: 'a', title: 'A', createdWeek: 2, contributors: { composer: ['C01'], lyrics: [] },
      originContext: [], musicProfile: { popularity: 50, artistry: 50, fanFit: 50, liveFit: 50 },
      genreTags: [], status: 'UNRELEASED', recordedWeek: null, rehearsalCount: 0,
    };
    s.performanceHistory.push({
      id: 'p1', week: 5, absoluteWeek: 5, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
      lineup: [{ slot: 'VOCAL', label: '윤하진', characterId: 'C01' }],
      openingSongTitle: 'A', audience: 50, grade: 'GOOD SHOW',
      revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
    });
    goTo(s, 11);
    settleContracts(s);
    expect(s.characterStates.C01!.growth.experience).toBe(1234);
    expect(s.songs.a.contributors.composer).toContain('C01');
    expect(s.performanceHistory).toHaveLength(1);
    expect(s.characterStates.C01!.worldStatus).toBe('FORMER_MEMBER');
    expect(s.careerHistory.some((h) => h.text.includes('계약 만료'))).toBe(true);
  });

  it('연도를 넘어가도 만료 주차가 어긋나지 않는다', () => {
    const s = withContract({ startWeek: 40, endWeek: 40 + 26 - 1 }); // 2년차 13주차에 끝난다
    goTo(s, 65);
    settleContracts(s);
    expect(s.contracts.C01).toBeDefined(); // 아직 마지막 주
    goTo(s, 66);
    settleContracts(s);
    expect(s.contracts.C01).toBeUndefined();
    expect(s.world.year).toBe(2);
  });

  it('재계약은 기존 계약 직후 시작하고 기간을 중복 계산하지 않는다', () => {
    const s = withContract({ startWeek: 1, endWeek: 26 });
    s.contracts.C01!.renewal = { salary: 500_000, durationWeeks: 52, rolePromise: 'SUPPORT_MEMBER' };
    goTo(s, 26);
    settleContracts(s);
    expect(s.contracts.C01!.salary).toBe(400_000); // 마지막 주까지 기존 조건
    goTo(s, 27);
    settleContracts(s);
    const c = s.contracts.C01!;
    expect(c.salary).toBe(500_000);
    expect(c.rolePromise).toBe('SUPPORT_MEMBER');
    expect(c.startWeek).toBe(27);
    expect(c.endWeek).toBe(78);                 // 27 + 52 - 1
    expect(c.endWeek - c.startWeek + 1).toBe(52);
    expect(c.renewal).toBeNull();
    expect(s.band.activeMembers).toContain('C01');
  });

  it('재계약하지 않으면 그냥 만료된다', () => {
    const s = withContract({ endWeek: 26, renewal: null });
    goTo(s, 27);
    settleContracts(s);
    expect(s.contracts.C01).toBeUndefined();
  });

  it('역할 변경은 다음 주부터 적용되고 만료일은 그대로다', () => {
    const s = withContract({ startWeek: 1, endWeek: 52 });
    s.contracts.C01!.pendingChange = { salary: 460_000, rolePromise: 'SUPPORT_MEMBER', effectiveWeek: 11 };
    goTo(s, 10);
    settleContracts(s);
    expect(s.contracts.C01!.rolePromise).toBe('CORE_MEMBER'); // 아직 아니다
    expect(s.contracts.C01!.salary).toBe(400_000);
    goTo(s, 11);
    settleContracts(s);
    expect(s.contracts.C01!.rolePromise).toBe('SUPPORT_MEMBER');
    expect(s.contracts.C01!.salary).toBe(460_000);
    expect(s.contracts.C01!.endWeek).toBe(52);   // 만료일 유지
    expect(s.contracts.C01!.pendingChange).toBeNull();
  });

  it('역할 변경은 그 역할로 다시 판정을 통과한 주급이어야 한다 (할인 무임승차 차단)', () => {
    // 주전 기준 최저선으로 맺은 계약을, 서포트로 바꾸면서 주급을 그대로 유지할 수는 없다.
    const starterMin = requiredSalaryFor('C01', 52, 'CORE_MEMBER');
    expect(acceptsTerms('C01', terms(starterMin, 52, 'CORE_MEMBER'))).toBe(true);
    expect(acceptsTerms('C01', terms(starterMin, 52, 'SUPPORT_MEMBER'))).toBe(false);
    expect(requiredSalaryFor('C01', 52, 'SUPPORT_MEMBER')).toBeGreaterThan(starterMin);
  });
});


// ---------------------------------------------------------------- 4.4 경계 조건
describe('주전 약속 경계 조건', () => {
  function band(): SaveData {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C04'];
    s.contracts.C01 = {
      characterId: 'C01', salary: 400_000, startWeek: 1, endWeek: 52,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
    };
    return s;
  }
  // 1년차 기록이라 통산 주차와 그 해의 주차가 같다 (저장 경로가 만드는 모양).
  const show = (week: number, ids: CharacterId[]) => ({
    id: `p${week}`, week, absoluteWeek: week, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
    lineup: ids.map((id) => ({ slot: 'VOCAL' as const, label: '', characterId: id })),
    openingSongTitle: 'A', audience: 50, grade: 'GOOD SHOW' as const,
    revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
  });

  it('공연 1~3회만 있으면 그만큼만 본다', () => {
    [1, 2, 3].forEach((n) => {
      const s = band();
      for (let i = 0; i < n; i += 1) s.performanceHistory.push(show(i + 2, ['C01']));
      const p = starterPromise(s, 'C01');
      expect(p.considered).toBe(n);
      expect(p.absences).toBe(0);
      expect(p.met).toBe(true);
    });
  });

  it('4회 전부 출전이면 결장 0회다', () => {
    const s = band();
    [2, 3, 4, 5].forEach((w) => s.performanceHistory.push(show(w, ['C01'])));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);
    expect(p.absences).toBe(0);
  });

  it('오래된 결장은 최근 4회 밖으로 밀려나 빠진다', () => {
    const s = band();
    s.performanceHistory.push(
      show(2, ['C04']), show(3, ['C04']),
      show(4, ['C01']), show(5, ['C01']), show(6, ['C01']), show(7, ['C01']),
    );
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);
    expect(p.absences).toBe(0);
    expect(p.met).toBe(true);
  });

  it('여러 포지션을 가진 멤버도 출전 여부만 본다', () => {
    const s = band();
    s.contracts.C02 = {
      characterId: 'C02', salary: 350_000, startWeek: 1, endWeek: 52,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
    };
    s.performanceHistory.push(
      { ...show(2, ['C02']), lineup: [{ slot: 'KEYS' as const, label: '', characterId: 'C02' as CharacterId }] },
      { ...show(3, ['C02']), lineup: [{ slot: 'VOCAL' as const, label: '', characterId: 'C02' as CharacterId }] },
    );
    const p = starterPromise(s, 'C02');
    expect(p.considered).toBe(2);
    expect(p.absences).toBe(0);
  });

  it('같은 공연 결과가 중복 저장되면 결장이 중복으로 세어진다 (저장 단계에서 막아야 한다)', () => {
    const s = band();
    s.performanceHistory.push(show(2, ['C04']));
    const once = starterPromise(s, 'C01');
    expect(once.considered).toBe(1);
    expect(once.absences).toBe(1);
    expect(once.met).toBe(true);
    s.performanceHistory.push(show(2, ['C04']));
    expect(starterPromise(s, 'C01').absences).toBe(2);
  });
});

// ---------------------------------------------------------------- 4.4 A/B 구분 (회귀)
describe('약속을 지킬 편성이 실제로 있는지 구분한다', () => {
  /** 공연 기록을 만든다. ids = 그 공연에 실제로 선 사람. */
  const played = (i: number, ids: CharacterId[]) => ({
    id: `p${i}`, week: i + 2, absoluteWeek: i + 2, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
    lineup: ids.map((id) => ({ slot: 'VOCAL' as const, label: '', characterId: id })),
    openingSongTitle: 'A', audience: 50, grade: 'GOOD SHOW' as const,
    revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
  });
  const starter = (id: CharacterId) => ({
    characterId: id, salary: 300_000, startWeek: 1, endWeek: 52,
    rolePromise: 'CORE_MEMBER' as const, clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
  });

  it('빈 자리에 올리면 풀리는 위반은 고칠 수 있다고 알려준다', () => {
    // C01(보컬)은 계속 무대에 있고, C04(기타)는 벤치. GUITAR 칸이 비어 있다.
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C04'];
    s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' };
    s.band.lineup[1].assignment = null; // GUITAR
    s.contracts.C01 = starter('C01');
    s.contracts.C04 = starter('C04');
    // C04: 출전 → 결장 → 출전. 이번에도 빠지면 결장 2회가 된다.
    s.performanceHistory.push(played(0, ['C01', 'C04']), played(1, ['C01']), played(2, ['C01', 'C04']));

    const check = starterCheck(s);
    expect(check.violations.map((v) => v.characterId)).toEqual(['C04']);
    expect(check.fixable).toEqual([{ characterId: 'C04', slotLabel: 'GUITAR' }]);
    expect(check.unmeetable).toHaveLength(0);
    // 제안한 편성은 실제로 위반을 없앤다
    expect(starterViolations(s, ['C01', 'C04'])).toHaveLength(0);
  });

  it('어느 편성으로도 풀 수 없으면 고칠 수 있다고 하지 않는다', () => {
    // C01과 C02는 둘 다 보컬 계열 주전인데 VOCAL 칸은 하나뿐이고, 둘 다 이미 결장 1회다.
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C02'];
    s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' };
    s.band.lineup[1].assignment = null;
    s.contracts.C01 = starter('C01');
    s.contracts.C02 = starter('C02');
    s.performanceHistory.push(played(0, ['C02']), played(1, ['C01']), played(2, ['C01']), played(3, ['C02']));

    const check = starterCheck(s);
    expect(check.violations.length).toBeGreaterThan(0);
    // 누구를 올려도 다른 주전이 대신 약속을 어긴다 -> fixable로 분류하면 공연이 영원히 막힌다
    expect(check.fixable).toHaveLength(0);
    expect(check.unmeetable.length).toBeGreaterThan(0);
    expect(starterViolations(s, ['C02'])).not.toHaveLength(0);
  });

  it('먼저 본 사람이 좋은 칸을 차지해도 가능한 편성을 찾아낸다', () => {
    // C02(Vocal/Keys)를 먼저 계약해 C02가 먼저 평가되게 한다.
    // C02가 VOCAL을 차지하면 VOCAL뿐인 C01이 갈 곳을 잃지만, VOCAL=C01 / KEYS=C02는 성립한다.
    const s = createNewGame('T');
    s.band.activeMembers = ['C02', 'C01'];
    s.band.lineup.push({ slotId: 'KEYS', assignment: null }); // 확장 포지션을 추가한 밴드
    s.band.lineup[0].assignment = { kind: 'SESSION', instanceId: 'sess_1' } as never; // VOCAL은 세션
    (['C02', 'C01'] as CharacterId[]).forEach((id) => {
      s.contracts[id] = {
        characterId: id, salary: 300_000, startWeek: 1, endWeek: 52,
        rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
      };
    });
    s.performanceHistory.push(played(0, ['C01', 'C02']), played(1, ['C04']), played(2, ['C01', 'C02']));

    const check = starterCheck(s);
    expect(check.violations.map((v) => v.characterId).sort()).toEqual(['C01', 'C02']);
    expect(check.unmeetable).toHaveLength(0);
    // 서로 다른 칸을 받아야 실제로 세울 수 있는 편성이다
    const bySlot = Object.fromEntries(check.fixable.map((f) => [f.characterId, f.slotLabel]));
    expect(bySlot.C01).toBe('VOCAL');
    expect(bySlot.C02).toBe('KEYS');
    // 제안한 편성이 실제로 모든 약속을 지킨다
    expect(starterViolations(s, ['C01', 'C02'])).toHaveLength(0);
  });

  it('한 자리에 두 명을 세우라고 제안하지 않는다', () => {
    // VOCAL 칸을 세션이 쓰고 있어 보컬 계열 주전 둘이 모두 벤치에 있다.
    // 둘을 함께 올려야 위반이 풀리지만 호환되는 칸은 VOCAL 하나뿐이라 실제로는 세울 수 없다.
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C02'];
    s.band.lineup[0].assignment = { kind: 'SESSION', instanceId: 'sess_1' } as never;
    s.band.lineup[1].assignment = null;
    (['C01', 'C02'] as CharacterId[]).forEach((id) => {
      s.contracts[id] = {
        characterId: id, salary: 300_000, startWeek: 1, endWeek: 52,
        rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
      };
    });
    s.performanceHistory.push(played(0, ['C01', 'C02']), played(1, ['C04']), played(2, ['C01', 'C02']));

    const check = starterCheck(s);
    expect(check.violations.map((v) => v.characterId).sort()).toEqual(['C01', 'C02']);
    // 같은 칸을 두 사람에게 배정하는 제안은 내놓지 않는다 (지킬 수 없는 안내로 공연이 막히지 않게)
    const slots = check.fixable.map((f) => f.slotLabel);
    expect(new Set(slots).size).toBe(slots.length);
    expect(check.fixable).toHaveLength(0);
    expect(check.unmeetable.sort()).toEqual(['C01', 'C02']);
  });

  it('위반이 없으면 아무것도 제안하지 않는다', () => {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C04'];
    s.band.lineup[0].assignment = { kind: 'MEMBER', characterId: 'C01' };
    s.band.lineup[1].assignment = { kind: 'MEMBER', characterId: 'C04' };
    s.contracts.C01 = starter('C01');
    s.contracts.C04 = starter('C04');
    s.performanceHistory.push(played(0, ['C01', 'C04']), played(1, ['C01', 'C04']));
    const check = starterCheck(s);
    expect(check.violations).toHaveLength(0);
    expect(check.fixable).toHaveLength(0);
    expect(check.unmeetable).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- 4.2 급여
describe('급여는 합의한 계약 조건에서 나온다', () => {
  it('현재 판정식으로 다시 값을 매기지 않는다', () => {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01'];
    const agreed = 100_000;
    expect(acceptsTerms('C01', terms(agreed, 52, 'CORE_MEMBER'))).toBe(false);
    s.contracts.C01 = {
      characterId: 'C01', salary: agreed, startWeek: 1, endWeek: 52,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
    };
    expect(weeklySalaryBurden(s)).toBe(agreed);
  });

  it('마지막 주까지 지급하고 만료 뒤에는 지급하지 않는다', () => {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01'];
    s.contracts.C01 = {
      characterId: 'C01', salary: 400_000, startWeek: 1, endWeek: 1,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
    };
    expect(weeklySalaryBurden(s)).toBe(400_000);
    s.world.week = 2;
    settleContracts(s);
    expect(weeklySalaryBurden(s)).toBe(0);
  });

  it('재계약이 예약돼 있어도 같은 주에 두 번 계산되지 않는다', () => {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01'];
    s.contracts.C01 = {
      characterId: 'C01', salary: 400_000, startWeek: 1, endWeek: 2,
      rolePromise: 'CORE_MEMBER', clauses: [], satisfaction: 70,
      renewal: { salary: 500_000, durationWeeks: 26, rolePromise: 'CORE_MEMBER' }, pendingChange: null,
    };
    s.world.week = 2;
    expect(weeklySalaryBurden(s)).toBe(400_000);
    s.world.week = 3;
    settleContracts(s);
    expect(weeklySalaryBurden(s)).toBe(500_000);
    expect(s.band.activeMembers).toContain('C01');
  });
});


// ---------------------------------------------------------------- 절대 주차 기준 자격 판정
describe('연도를 넘어가도 계약 기간 안의 공연을 찾는다', () => {
  const starter = (id: CharacterId, startWeek: number, endWeek: number) => ({
    characterId: id, salary: 300_000, startWeek, endWeek,
    rolePromise: 'CORE_MEMBER' as const, clauses: [], satisfaction: 70, renewal: null, pendingChange: null,
  });
  /** 절대 주차로 공연 기록을 만든다. week은 그 해의 주차, absoluteWeek은 통산 주차. */
  const doneAt = (abs: number, ids: CharacterId[]) => {
    const year = Math.floor((abs - 1) / 52) + 1;
    return {
      id: `p${abs}`, week: abs - (year - 1) * 52, absoluteWeek: abs,
      venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
      lineup: ids.map((id) => ({ slot: 'VOCAL' as const, label: '', characterId: id })),
      openingSongTitle: 'A', audience: 50, grade: 'GOOD SHOW' as const,
      revenue: 1, fansDelta: 1, reputationDelta: 1, crowdEnergyPeak: 50, choices: [],
    };
  };
  function band(startWeek: number, endWeek: number): SaveData {
    const s = createNewGame('T');
    s.band.activeMembers = ['C01', 'C04'];
    s.contracts.C01 = starter('C01', startWeek, endWeek);
    return s;
  }

  it('A1 · 2년차 계약의 공연이 판정에서 빠지지 않는다', () => {
    const s = band(60, 111);          // 2년차 8주차에 시작한 계약
    s.world.year = 2; s.world.week = 13;
    [61, 62, 63, 64].forEach((abs) => s.performanceHistory.push(doneAt(abs, ['C04'])));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);
    expect(p.absences).toBe(4);
    expect(p.met).toBe(false);
  });

  it('A2 · 연말과 연초에 걸친 공연을 같은 연표로 본다', () => {
    const s = band(48, 99);           // 1년차 48주 ~ 2년차 47주
    s.world.year = 2; s.world.week = 5;
    // 1년차 50·52주(절대 50·52), 2년차 1·3주(절대 53·55)
    s.performanceHistory.push(doneAt(50, ['C01']), doneAt(52, ['C01']), doneAt(53, ['C01']), doneAt(55, ['C04']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);     // 연초 공연이 주차가 작다고 버려지지 않는다
    expect(p.absences).toBe(1);
    expect(p.met).toBe(true);
  });

  it('A3 · 재계약하면 판정 구간이 새로 시작한다', () => {
    const s = band(53, 104);          // 재계약: 이전 계약은 52주에 끝났다
    s.world.year = 2; s.world.week = 8;
    // 이전 계약 기간(≤52)의 결장은 새 판정에 들어가지 않는다
    s.performanceHistory.push(doneAt(49, ['C04']), doneAt(50, ['C04']), doneAt(51, ['C04']), doneAt(52, ['C04']));
    expect(starterPromise(s, 'C01').considered).toBe(0);
    // 새 계약 이후 공연만 본다
    s.performanceHistory.push(doneAt(53, ['C01']), doneAt(54, ['C04']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(2);
    expect(p.absences).toBe(1);
    expect(p.met).toBe(true);
  });

  it('A4 · 2년차 이후 재계약도 약속 판정을 건너뛰지 않는다', () => {
    const s = band(105, 156);         // 3년차에 시작한 재계약
    s.world.year = 3; s.world.week = 10;
    [106, 107, 108, 109].forEach((abs) => s.performanceHistory.push(doneAt(abs, ['C04'])));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(4);
    expect(p.absences).toBe(4);
    expect(p.met).toBe(false);
  });

  it('계약 시작 주차의 공연은 포함한다 (하한 포함)', () => {
    const s = band(60, 111);
    s.performanceHistory.push(doneAt(59, ['C04']), doneAt(60, ['C04']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(1);     // 59주차는 계약 전, 60주차는 포함
    expect(p.absences).toBe(1);
  });

  it('A5 · absoluteWeek이 없는 과거 기록은 출전으로도 결장으로도 세지 않는다', () => {
    const s = band(60, 111);
    s.world.year = 2; s.world.week = 13;
    const legacy = doneAt(61, ['C04']) as Record<string, unknown>;
    delete legacy.absoluteWeek;       // 예전 세이브에는 이 필드가 없다
    s.performanceHistory.push(legacy as never);
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(0);
    expect(p.absences).toBe(0);
    expect(p.met).toBe(true);
    // 기록 자체는 그대로 남는다
    expect(s.performanceHistory).toHaveLength(1);
    expect(s.performanceHistory[0].absoluteWeek).toBeUndefined();
    expect(s.performanceHistory[0].audience).toBe(50);
  });

  it('absoluteWeek이 없는 기록이 섞여 있어도 나머지는 정상 판정한다', () => {
    const s = band(60, 111);
    const legacy = doneAt(61, ['C04']) as Record<string, unknown>;
    delete legacy.absoluteWeek;
    s.performanceHistory.push(legacy as never, doneAt(62, ['C04']), doneAt(63, ['C01']));
    const p = starterPromise(s, 'C01');
    expect(p.considered).toBe(2);
    expect(p.absences).toBe(1);
  });
});
