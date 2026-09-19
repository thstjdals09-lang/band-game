// 계약 판정과 계약 이행 (CONTRACT V1).
//
// 판정은 순수 함수 evaluateContract() 하나뿐이다. 화면 표시, 역제안, 최종 저장, 재계약, 역할 변경이
// 전부 이 함수를 통과한다. 확률을 굴리지 않는 결정론적 판정이다.
//
// 근거가 되는 문서 값: 캐릭터 personality (Character Master §09), contractProfile의
// baseSalary / preferredDurationWeeks. 그 사이를 잇는 가중치는 CONTRACT_V1_PROVISIONAL의 시험값이다.
import {
  CHARACTERS, CONTRACT_DURATION_OPTIONS, CONTRACT_PROFILES, CONTRACT_V1_PROVISIONAL,
  PROTOTYPE_BALANCE, type CharacterId,
} from '@/data/master';
import type { ContractState, PerformanceSnapshot, SaveData } from '../save/schema';

const V1 = CONTRACT_V1_PROVISIONAL;
const B = PROTOTYPE_BALANCE.contract;

export type RolePromise = 'CORE_MEMBER' | 'SUPPORT_MEMBER';

export interface ContractTerms {
  salary: number;
  durationWeeks: number;
  rolePromise: RolePromise;
}

export interface ContractDecision {
  accepted: boolean;
  /** 왜 받아들였는지 / 왜 거절했는지를 사람 말로. */
  reason: string;
  /** 거절했을 때 실제로 받아들이는 수정 조건. 최대 2개, 전부 accepted = true. */
  counterOffers: ContractTerms[];
  /** 이 기간·역할 조합에서 받아들이는 최저 주급. */
  requiredSalary: number;
  baseSalary: number;
  preferredDurationWeeks: number;
}

// ---------------------------------------------------------------- 기준값
export function baseSalaryOf(characterId: CharacterId): number {
  return CONTRACT_PROFILES[CHARACTERS[characterId]?.contractProfileId ?? '']?.baseSalary ?? 300_000;
}
export function preferredDurationOf(characterId: CharacterId): number {
  return CONTRACT_PROFILES[CHARACTERS[characterId]?.contractProfileId ?? '']?.preferredDurationWeeks ?? 52;
}

const stepIndex = (weeks: number) => {
  const i = CONTRACT_DURATION_OPTIONS.indexOf(weeks as (typeof CONTRACT_DURATION_OPTIONS)[number]);
  return i >= 0 ? i : CONTRACT_DURATION_OPTIONS.indexOf(52);
};

/** 선호 기간에서 얼마나, 어느 방향으로 떨어져 있는지에 따른 요구 비율 변화. */
export function durationAdjustment(characterId: CharacterId, durationWeeks: number): number {
  const c = CHARACTERS[characterId];
  if (!c) return 0;
  const steps = stepIndex(durationWeeks) - stepIndex(preferredDurationOf(characterId));
  if (steps === 0) return 0;
  // riskTolerance 50이 중립. 높을수록 묶이는 것을 싫어한다.
  const risk = (c.personality.riskTolerance - 50) / 50;
  return steps * risk * V1.durationStepWeight;
}

/** 서포트 약속에 대한 요구 비율 변화. 주전에는 어떤 보정도 없다. */
export function roleAdjustment(characterId: CharacterId, rolePromise: RolePromise): number {
  const c = CHARACTERS[characterId];
  if (!c || rolePromise !== 'SUPPORT_MEMBER') return 0;
  const ego = (c.personality.ego - 50) / 50;
  return ego * V1.supportRoleWeight;
}

/** 이 조건에서 받아들이는 최저 주급. 주급 조절 단위에 맞춰 올림해 화면에서 그대로 고를 수 있다. */
export function requiredSalaryFor(characterId: CharacterId, durationWeeks: number, rolePromise: RolePromise): number {
  const ratio = Math.min(
    V1.maxRequiredRatio,
    Math.max(
      V1.minRequiredRatio,
      V1.baseAcceptRatio + durationAdjustment(characterId, durationWeeks) + roleAdjustment(characterId, rolePromise),
    ),
  );
  const raw = baseSalaryOf(characterId) * ratio;
  return Math.max(B.minSalary, Math.ceil(raw / B.salaryStep) * B.salaryStep);
}

/** 남은 주수를 계약 기간 선택지 중 가장 가까운 값으로 본다 (역할 변경 재판정용). */
export function nearestDurationOption(weeks: number): number {
  return CONTRACT_DURATION_OPTIONS.reduce(
    (best, opt) => (Math.abs(opt - weeks) < Math.abs(best - weeks) ? opt : best),
    CONTRACT_DURATION_OPTIONS[0] as number,
  );
}

export function acceptsTerms(characterId: CharacterId, terms: ContractTerms): boolean {
  return terms.salary >= requiredSalaryFor(characterId, terms.durationWeeks, terms.rolePromise);
}

const roleWord = (r: RolePromise) => (r === 'CORE_MEMBER' ? '주전' : '서포트');
const money = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

function refusalReason(characterId: CharacterId, terms: ContractTerms, required: number): string {
  const parts: string[] = [];
  const dAdj = durationAdjustment(characterId, terms.durationWeeks);
  const rAdj = roleAdjustment(characterId, terms.rolePromise);
  const preferred = preferredDurationOf(characterId);
  if (dAdj > 0) parts.push(`${terms.durationWeeks}주 계약은 ${preferred}주보다 부담스럽다`);
  if (rAdj > 0) parts.push('무대를 양보하는 자리는 그만큼 더 받아야 한다');
  const because = parts.length > 0 ? `${parts.join(', ')}. ` : '';
  return `${because}이 조건이라면 주급 ${money(required)}은 되어야 한다.`;
}

function acceptReason(characterId: CharacterId, terms: ContractTerms): string {
  const dAdj = durationAdjustment(characterId, terms.durationWeeks);
  const rAdj = roleAdjustment(characterId, terms.rolePromise);
  const preferred = preferredDurationOf(characterId);
  if (dAdj < 0 && terms.durationWeeks > preferred) return '길게 묶이는 편이 오히려 마음이 놓인다며 받아들인다.';
  if (dAdj < 0 && terms.durationWeeks < preferred) return '짧게 가는 조건이 마음에 든다며 받아들인다.';
  if (rAdj < 0) return `앞에 서지 않아도 괜찮다며 ${roleWord(terms.rolePromise)} 자리를 받아들인다.`;
  return '이 조건이면 함께하겠다고 한다.';
}

/**
 * 계약 판정. 거절이면 실제로 받아들이는 수정 조건을 최대 2개까지 함께 준다.
 * 역제안은 주급을 올리는 길과 기간·역할을 바꾸는 길을 섞어, 기간·역할이 판정에 영향을 준다는 사실이
 * 실제 선택지로 드러나게 한다.
 */
export function evaluateContract(
  characterId: CharacterId,
  salary: number,
  durationWeeks: number,
  rolePromise: RolePromise,
): ContractDecision {
  const terms: ContractTerms = { salary, durationWeeks, rolePromise };
  const requiredSalary = requiredSalaryFor(characterId, durationWeeks, rolePromise);
  const baseSalary = baseSalaryOf(characterId);
  const preferred = preferredDurationOf(characterId);
  const accepted = acceptsTerms(characterId, terms);

  if (accepted) {
    return {
      accepted: true,
      reason: acceptReason(characterId, terms),
      counterOffers: [],
      requiredSalary, baseSalary, preferredDurationWeeks: preferred,
    };
  }

  const counters: ContractTerms[] = [];
  const push = (t: ContractTerms) => {
    if (counters.length >= 2) return;
    if (!acceptsTerms(characterId, t)) return; // 판정을 통과하지 못하는 역제안은 내놓지 않는다
    if (counters.some((x) => sameTerms(x, t))) return;
    counters.push(t);
  };

  // 1) 지금 조건 그대로, 주급만 최저선까지.
  push({ ...terms, salary: requiredSalary });
  // 2) 주급은 그대로 두고 기간이나 역할을 바꿔서 성립시키는 길.
  const alternatives: ContractTerms[] = [];
  CONTRACT_DURATION_OPTIONS.forEach((weeks) => {
    if (weeks !== durationWeeks) alternatives.push({ ...terms, durationWeeks: weeks });
  });
  if (rolePromise === 'SUPPORT_MEMBER') alternatives.push({ ...terms, rolePromise: 'CORE_MEMBER' });
  // 선호 기간에 가까운 쪽을 먼저 제안한다.
  alternatives
    .sort((a, b) => Math.abs(stepIndex(a.durationWeeks) - stepIndex(preferred)) - Math.abs(stepIndex(b.durationWeeks) - stepIndex(preferred)))
    .forEach(push);

  return {
    accepted: false,
    reason: refusalReason(characterId, terms, requiredSalary),
    counterOffers: counters,
    requiredSalary, baseSalary, preferredDurationWeeks: preferred,
  };
}

export function sameTerms(a: ContractTerms | null, b: ContractTerms | null): boolean {
  if (!a || !b) return false;
  return a.salary === b.salary && a.durationWeeks === b.durationWeeks && a.rolePromise === b.rolePromise;
}

// ---------------------------------------------------------------- 계약 기간 / 재계약
/** 연도를 넘어가도 주수 계산이 어긋나지 않도록 모든 계약 주차는 절대 주차로 다룬다. */
export function absoluteWeek(world: { week: number; year: number }): number {
  return world.week + (world.year - 1) * 52;
}

export function weeksLeft(contract: ContractState, world: { week: number; year: number }): number {
  return contract.endWeek - absoluteWeek(world);
}

/** 계약 마지막 구간에 들어서면 재계약 협상이 열린다. */
export function renewalOpen(contract: ContractState, world: { week: number; year: number }): boolean {
  const left = weeksLeft(contract, world);
  return left >= 0 && left < V1.renewalWindowWeeks;
}

/** 이번 주 정산까지 마치면 계약이 끝나는가. */
export function expiresAfter(contract: ContractState, world: { week: number; year: number }): boolean {
  return absoluteWeek(world) >= contract.endWeek;
}

// ---------------------------------------------------------------- 주전 기용 약속
export interface StarterPromiseView {
  characterId: CharacterId;
  /** 판정에 사용한 공연 수 (계약 시작 이후 완료된 공연, 최대 starterRecentShows). */
  considered: number;
  absences: number;
  allowed: number;
  met: boolean;
}

/** 그 공연에 실제로 무대에 섰던 멤버. 기록이 없는 과거 공연은 판정에서 제외한다. */
export function performersOf(snapshot: PerformanceSnapshot): CharacterId[] | null {
  // characterId를 기록하기 전에 저장된 공연은 출전자를 알 수 없다. 가짜로 채우지 않는다.
  if (!snapshot.lineup.some((s) => 'characterId' in s)) return null;
  return snapshot.lineup.map((s) => s.characterId).filter((id): id is CharacterId => !!id);
}

/**
 * 주전 기용 약속 판정. 계약 시작 이후 실제로 완료된 공연만 보고, 출전 기록이 없는 과거 공연은
 * 가짜로 채우지 않고 건너뛴다. upcomingPerformers를 주면 그 공연까지 포함해 미리 계산한다.
 */
export function starterPromise(
  save: SaveData,
  characterId: CharacterId,
  upcomingPerformers?: CharacterId[],
): StarterPromiseView {
  const contract = save.contracts[characterId];
  const allowed = V1.starterAllowedAbsences;
  const base: StarterPromiseView = { characterId, considered: 0, absences: 0, allowed, met: true };
  if (!contract || contract.rolePromise !== 'CORE_MEMBER') return base;

  const shows: boolean[] = []; // true = 출전
  save.performanceHistory.forEach((snap) => {
    if (snap.week < contract.startWeek) return; // 계약 이전 공연은 계산하지 않는다
    const performers = performersOf(snap);
    if (performers === null) return; // 검증할 수 없는 기록은 건너뛴다
    shows.push(performers.includes(characterId));
  });
  if (upcomingPerformers) shows.push(upcomingPerformers.includes(characterId));

  const recent = shows.slice(-V1.starterRecentShows);
  const absences = recent.filter((on) => !on).length;
  return { characterId, considered: recent.length, absences, allowed, met: absences <= allowed };
}

/** 이번 공연을 이 편성으로 치렀을 때 약속을 어기게 되는 주전들. */
export function starterViolations(save: SaveData, performers: CharacterId[]): StarterPromiseView[] {
  return Object.values(save.contracts)
    .filter((c): c is ContractState => !!c && c.rolePromise === 'CORE_MEMBER')
    .map((c) => starterPromise(save, c.characterId, performers))
    .filter((v) => !v.met);
}

// ---------------------------------------------------------------- 주간 계약 정산
/**
 * 한 주가 끝난 직후의 계약 처리 (CONTRACT V1 §2·§3·§5).
 *  - 합의한 주차가 된 역할 변경을 적용한다 (만료일은 그대로).
 *  - 마지막 주 정산까지 마친 계약을 종료한다. 재계약이 예약되어 있으면 그 다음 주부터 새 계약이 시작된다.
 *  - 만료한 멤버는 급여·라인업·공연 대상에서 빠지지만 성장·참여 곡·과거 공연 기록은 그대로 남는다.
 */
export function settleContracts(d: SaveData) {
  const abs = absoluteWeek(d.world);
  Object.values(d.contracts).forEach((c) => {
    if (!c) return;

    // 역할 변경은 합의한 다음 주부터
    if (c.pendingChange && abs >= c.pendingChange.effectiveWeek) {
      c.salary = c.pendingChange.salary;
      c.rolePromise = c.pendingChange.rolePromise;
      d.careerHistory.push({
        week: d.world.week, type: 'CONTRACT',
        text: `${CHARACTERS[c.characterId].name} 역할 변경 · ${c.rolePromise === 'CORE_MEMBER' ? '주전' : '서포트'}`,
      });
      c.pendingChange = null;
    }

    // 지난 주가 계약의 마지막 주였다면 여기서 끝난다
    if (abs <= c.endWeek) return;

    if (c.renewal) {
      const r = c.renewal;
      c.salary = r.salary;
      c.rolePromise = r.rolePromise;
      c.startWeek = c.endWeek + 1;               // 기존 계약 종료 직후 시작
      c.endWeek = c.startWeek + r.durationWeeks - 1; // 기간을 중복 계산하지 않는다
      c.renewal = null;
      c.pendingChange = null;
      d.careerHistory.push({
        week: d.world.week, type: 'CONTRACT',
        text: `${CHARACTERS[c.characterId].name} 재계약 (${r.durationWeeks}주)`,
      });
      return;
    }

    // 만료: 멤버에서 빠지지만 기록은 남는다
    const id = c.characterId;
    delete d.contracts[id];
    d.band.activeMembers = d.band.activeMembers.filter((x) => x !== id);
    d.band.lineup.forEach((slot) => {
      if (slot.assignment?.kind === 'MEMBER' && slot.assignment.characterId === id) slot.assignment = null;
    });
    if (d.band.officialLeaderCharacterId === id) d.band.officialLeaderCharacterId = d.band.activeMembers[0] ?? null;
    const st = d.characterStates[id];
    // 초기 조건으로 다시 영입하는 우회 경로를 막는다: 오디션 후보로 되돌리지 않는다.
    if (st) st.worldStatus = 'FORMER_MEMBER';
    d.careerHistory.push({
      week: d.world.week, type: 'CONTRACT',
      text: `${CHARACTERS[id].name} 계약 만료`,
    });
  });
}
