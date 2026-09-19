// CONTRACT V1: 판정 · 기간 · 재계약 · 주전 기용 약속.
import { describe, expect, it } from 'vitest';

import { CHARACTERS, CONTRACT_PROFILES, CONTRACT_V1_PROVISIONAL, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';
import { createNewGame } from '@/state/save/newGame';
import type { ContractState, SaveData } from '@/state/save/schema';
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
  const show = (week: number, ids: CharacterId[]) => ({
    id: `p${week}`, week, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
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
      id: 'p1', week: 5, venueId: 'BASEMENT_CLUB', venueName: 'Basement Club',
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
