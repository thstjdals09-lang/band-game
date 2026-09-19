// 계약 수락 판정: 표시 · 역제안 · 실제 체결이 모두 같은 규칙을 쓴다.
import { describe, expect, it } from 'vitest';

import { CONTRACT_PROFILES, CHARACTERS, PROTOTYPE_BALANCE } from '@/data/master';
import {
  acceptsTerms, baseSalaryOf, evaluateContract, minAcceptableSalary, preferredDurationOf, sameTerms,
  type ContractTerms,
} from './contract';

const B = PROTOTYPE_BALANCE.contract;
const terms = (salary: number, durationWeeks = 52, rolePromise: ContractTerms['rolePromise'] = 'CORE_MEMBER'): ContractTerms =>
  ({ salary, durationWeeks, rolePromise });

describe('what the decision actually rests on', () => {
  it('reads the base salary from the character contract profile', () => {
    expect(baseSalaryOf('C01')).toBe(CONTRACT_PROFILES[CHARACTERS.C01.contractProfileId].baseSalary);
    expect(baseSalaryOf('C04')).toBe(CONTRACT_PROFILES[CHARACTERS.C04.contractProfileId].baseSalary);
    expect(preferredDurationOf('C01')).toBe(CONTRACT_PROFILES[CHARACTERS.C01.contractProfileId].preferredDurationWeeks);
  });

  it('accepts the base salary and refuses well below the floor', () => {
    expect(acceptsTerms('C01', terms(baseSalaryOf('C01')))).toBe(true);
    expect(acceptsTerms('C01', terms(B.minSalary))).toBe(false);
  });

  it('puts the floor on a step boundary so the stepper can reach it', () => {
    (['C01', 'C04', 'C13', 'C15'] as const).forEach((id) => {
      const min = minAcceptableSalary(id);
      expect(min % B.salaryStep).toBe(0);
      expect(min).toBeGreaterThanOrEqual(baseSalaryOf(id) * B.acceptSalaryRatio);
      expect(acceptsTerms(id, terms(min))).toBe(true);
      expect(acceptsTerms(id, terms(min - B.salaryStep))).toBe(false);
    });
  });

  it('ignores duration and role, as the promise rules are not designed yet', () => {
    const salary = baseSalaryOf('C01');
    B.durationOptionsWeeks.forEach((weeks) => {
      expect(acceptsTerms('C01', terms(salary, weeks, 'CORE_MEMBER'))).toBe(true);
      expect(acceptsTerms('C01', terms(salary, weeks, 'SUPPORT_MEMBER'))).toBe(true);
    });
    // and they cannot rescue a salary that is too low either
    expect(acceptsTerms('C01', terms(B.minSalary, 104, 'SUPPORT_MEMBER'))).toBe(false);
  });
});

describe('what the screen shows matches what happens', () => {
  it('says accepted exactly when the terms are accepted', () => {
    [50_000, 150_000, 300_000, 400_000, 900_000].forEach((salary) => {
      const d = evaluateContract('C01', terms(salary));
      expect(d.accepted).toBe(acceptsTerms('C01', terms(salary)));
    });
  });

  it('offers no counter when the terms already work', () => {
    expect(evaluateContract('C01', terms(baseSalaryOf('C01'))).counters).toHaveLength(0);
  });
});

describe('counter offers are real offers', () => {
  it('proposes at most two, and every one of them is accepted by the same rule', () => {
    (['C01', 'C04', 'C05', 'C13'] as const).forEach((id) => {
      const d = evaluateContract(id, terms(B.minSalary));
      expect(d.counters.length).toBeGreaterThan(0);
      expect(d.counters.length).toBeLessThanOrEqual(2);
      d.counters.forEach((t) => expect(acceptsTerms(id, t)).toBe(true));
    });
  });

  it('keeps the duration and role the player chose', () => {
    const d = evaluateContract('C01', terms(50_000, 104, 'SUPPORT_MEMBER'));
    d.counters.forEach((t) => {
      expect(t.durationWeeks).toBe(104);
      expect(t.rolePromise).toBe('SUPPORT_MEMBER');
    });
  });

  it('leads with the cheapest workable salary and never repeats it', () => {
    const d = evaluateContract('C01', terms(50_000));
    expect(d.counters[0].salary).toBe(minAcceptableSalary('C01'));
    expect(new Set(d.counters.map((t) => t.salary)).size).toBe(d.counters.length);
  });

  it('collapses to one option when the floor is the base salary', () => {
    // a profile whose floor rounds back up to its own base offers a single option
    const ids = ['C01', 'C04', 'C05', 'C06', 'C13', 'C14', 'C15'] as const;
    ids.forEach((id) => {
      const d = evaluateContract(id, terms(B.minSalary));
      if (minAcceptableSalary(id) === baseSalaryOf(id)) expect(d.counters).toHaveLength(1);
    });
  });
});

describe('an agreement is tied to the exact terms', () => {
  it('matches only identical terms', () => {
    const a = terms(400_000, 52, 'CORE_MEMBER');
    expect(sameTerms(a, { ...a })).toBe(true);
    expect(sameTerms(a, { ...a, salary: 450_000 })).toBe(false);
    expect(sameTerms(a, { ...a, durationWeeks: 104 })).toBe(false);
    expect(sameTerms(a, { ...a, rolePromise: 'SUPPORT_MEMBER' })).toBe(false);
    expect(sameTerms(a, null)).toBe(false);
    expect(sameTerms(null, a)).toBe(false);
  });
});
