// 계약 수락 판정 (PHASE 1).
//
// 단 하나의 규칙만 존재한다: 제안한 주급이 그 사람의 기준 주급 대비 일정 비율 이상인가.
// 확률을 굴리지 않는 결정론적 판정이므로 화면에도 확률처럼 보이는 표현을 쓰지 않는다.
//
// 계약 기간과 주전/서포트 역할은 계약서에 기록되지만 수락 판정에는 관여하지 않는다.
// 그 약속을 실제로 이행하는 규칙(주전 보장, 재계약, 불만 등)은 아직 기획 전이므로
// 여기서 임의의 급여 할인이나 가산을 만들지 않는다.
import { CHARACTERS, CONTRACT_PROFILES, PROTOTYPE_BALANCE, type CharacterId } from '@/data/master';

const B = PROTOTYPE_BALANCE.contract;

export type RolePromise = 'CORE_MEMBER' | 'SUPPORT_MEMBER';

export interface ContractTerms {
  salary: number;
  durationWeeks: number;
  rolePromise: RolePromise;
}

export interface ContractDecision {
  accepted: boolean;
  /** 그 사람의 기준 주급. */
  baseSalary: number;
  /** 받아들이는 최저 주급 (주급 조절 단위에 맞춰 올림). */
  minSalary: number;
  /** 거절했을 때, 실제로 받아들이는 수정 조건 (최대 2개). */
  counters: ContractTerms[];
}

export function baseSalaryOf(characterId: CharacterId): number {
  const profile = CONTRACT_PROFILES[CHARACTERS[characterId]?.contractProfileId ?? ''];
  return profile?.baseSalary ?? 300_000;
}

export function preferredDurationOf(characterId: CharacterId): number {
  const profile = CONTRACT_PROFILES[CHARACTERS[characterId]?.contractProfileId ?? ''];
  return profile?.preferredDurationWeeks ?? 52;
}

/** 받아들이는 최저 주급. 주급 조절 단위에 맞춰 올림하므로 화면에서 그대로 고를 수 있다. */
export function minAcceptableSalary(characterId: CharacterId): number {
  const raw = baseSalaryOf(characterId) * B.acceptSalaryRatio;
  const step = B.salaryStep;
  return Math.max(B.minSalary, Math.ceil(raw / step) * step);
}

/** 이 조건을 받아들이는가. 화면 표시·역제안·실제 체결이 모두 이 함수를 통과한다. */
export function acceptsTerms(characterId: CharacterId, terms: ContractTerms): boolean {
  return terms.salary >= minAcceptableSalary(characterId);
}

export function evaluateContract(characterId: CharacterId, terms: ContractTerms): ContractDecision {
  const baseSalary = baseSalaryOf(characterId);
  const minSalary = minAcceptableSalary(characterId);
  const accepted = acceptsTerms(characterId, terms);

  // 거절했다면 실제로 받아들이는 조건만 제시한다. 기간·역할은 플레이어가 고른 그대로 둔다.
  const counters: ContractTerms[] = [];
  if (!accepted) {
    const candidates = [minSalary, baseSalary];
    candidates.forEach((salary) => {
      const candidate: ContractTerms = { ...terms, salary };
      if (!acceptsTerms(characterId, candidate)) return;
      if (counters.some((x) => x.salary === salary)) return;
      counters.push(candidate);
    });
  }
  return { accepted, baseSalary, minSalary, counters: counters.slice(0, 2) };
}

export function sameTerms(a: ContractTerms | null, b: ContractTerms | null): boolean {
  if (!a || !b) return false;
  return a.salary === b.salary && a.durationWeeks === b.durationWeeks && a.rolePromise === b.rolePromise;
}
