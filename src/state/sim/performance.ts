// Performance result (IA v1.1 §19: "결과는 캐릭터/곡/준비/컨디션/관계/장비 등의 누적 상태를
// 중심으로 계산하고 랜덤은 보조로 사용한다").
//
// Implemented inputs: 멤버 실력·무대력·라이브 안정성, 오프닝 곡 라이브 적합도, 준비도(컨디션),
// 공연장 규모, 무대 위 순간 선택, 보조 랜덤.
// NOT implemented: 관계, 장비 -> PHASE 2B / 후속. They are absent, not faked.

import { CHARACTERS, PROTOTYPE_BALANCE, VENUES, type CharacterId } from '@/data/master';
import type { PerformanceSnapshot, SaveData } from '../save/schema';
import { performersOf } from './contract';
import { createRng } from './rng';

const P = PROTOTYPE_BALANCE.performance;
const W = PROTOTYPE_BALANCE.performanceScore;
const F = PROTOTYPE_BALANCE.familiarity;

export interface PerformanceInputs {
  /** 0..100 each, so the weighted score is readable. */
  skill: number;
  stagePresence: number;
  songLiveFit: number;
  condition: number;
  liveStability: number;
  /** Crowd reaction earned by the moment choices. */
  choiceBonus: number;
  /** 함께 무대에 서 온 경험에서 오는 가점 (0..F.maxBonus). 감점은 없다. */
  familiarityBonus: number;
  random: number;
}

export interface PerformanceResult {
  score: number;
  grade: PerformanceSnapshot['grade'];
  audience: number;
  soldOut: boolean;
  revenue: number;
  fansDelta: number;
  reputationDelta: number;
  inputs: PerformanceInputs;
}

/** Members actually on stage, including sessions (sessions contribute a flat competence). */
function stageRoster(save: SaveData): { characterId?: CharacterId }[] {
  return save.band.lineup
    .filter((s) => !!s.assignment)
    .map((s) => (s.assignment!.kind === 'MEMBER' ? { characterId: s.assignment!.characterId } : {}));
}

const SESSION_BASELINE = 55; // TODO(balance): a generic session musician's competence.

function averageOf(save: SaveData, pick: (id: CharacterId) => number): number {
  const roster = stageRoster(save);
  if (roster.length === 0) return 0;
  const total = roster.reduce((a, r) => a + (r.characterId ? pick(r.characterId) : SESSION_BASELINE), 0);
  return total / roster.length;
}

/** Band readiness right now: energy, morale and low stress across the people on stage. */
export function preparedness(save: SaveData): number {
  const roster = stageRoster(save);
  if (roster.length === 0) return 0;
  const total = roster.reduce((a, r) => {
    if (!r.characterId) return a + 70;
    const c = save.characterStates[r.characterId]?.condition;
    if (!c) return a + 70;
    return a + c.energy * 0.5 + c.morale * 0.3 + (100 - c.stress) * 0.2;
  }, 0);
  return total / roster.length;
}

export function performanceInputs(save: SaveData, choiceBonus: number, random: number): PerformanceInputs {
  const stats = (id: CharacterId) => ({ ...CHARACTERS[id].visibleStats, ...save.characterStates[id]?.currentStats });
  const opening = save.pendingPerformance?.openingSongId
    ? save.songs[save.pendingPerformance.openingSongId]
    : undefined;
  return {
    skill: averageOf(save, (id) => stats(id).skill),
    stagePresence: averageOf(save, (id) => stats(id).stage),
    songLiveFit: opening?.musicProfile.liveFit ?? 40,
    condition: preparedness(save),
    liveStability: averageOf(save, (id) => CHARACTERS[id].hiddenStats.liveStability),
    choiceBonus,
    familiarityBonus: liveFamiliarity(save).bonus,
    random,
  };
}

export function scoreOf(i: PerformanceInputs): number {
  const base =
    i.skill * W.skill
    + i.stagePresence * W.stagePresence
    + i.songLiveFit * W.songLiveFit
    + i.condition * W.condition
    + i.liveStability * W.liveStability;
  return Math.max(0, Math.min(100, base + i.choiceBonus + i.familiarityBonus + i.random));
}

export function gradeOf(score: number): PerformanceSnapshot['grade'] {
  if (score >= P.gradeThresholds.great) return 'GREAT SHOW';
  if (score >= P.gradeThresholds.good) return 'GOOD SHOW';
  if (score >= P.gradeThresholds.okay) return 'OKAY';
  return 'DISASTER';
}

/**
 * Resolve the show. `choiceScore` is 0..1 from the moment choices the player made.
 * Random stays inside a small spread so it can only nudge the outcome.
 */
export function resolvePerformance(save: SaveData, choiceScore: number): PerformanceResult {
  const pending = save.pendingPerformance;
  const venue = pending ? VENUES[pending.venueId] : VENUES.BASEMENT_CLUB;
  const rng = createRng(save.rng.baseSeed, 'performance', save.rng.streams.performance);

  const choiceBonus = Math.max(0, Math.min(1, choiceScore)) * W.choiceBonusMax;
  const random = rng.spread(W.randomSpread);
  const inputs = performanceInputs(save, choiceBonus, random);
  const score = scoreOf(inputs);
  const grade = gradeOf(score);

  // Draw scales with fame and how good the night is; a great show can fill the room.
  const draw = P.baseAudience + save.band.metrics.fans * P.audiencePerFan * (0.6 + score / 100);
  const audience = Math.max(10, Math.min(venue.capacity, Math.round(draw)));
  const soldOut = audience >= venue.capacity;

  return {
    score,
    grade,
    audience,
    soldOut,
    revenue: audience * P.ticketRevenue,
    fansDelta: Math.round(audience * P.fansPerAudience * (0.6 + score / 120)),
    reputationDelta: P.reputationDelta[grade],
    inputs,
  };
}

// ---------------------------------------------------------------- 함께 선 무대 (읽기 전용)
/**
 * 두 고정 캐릭터가 함께 끝낸 공연이 몇 번인지 센다.
 *
 * 이미 끝난 공연 기록(performanceHistory)만 본다. 값을 저장하지 않고, 어떤 계산에도 보너스로
 * 들어가지 않는다. 공연 점수·보상·관계·성장은 이 함수로 달라지지 않는다.
 *
 *  - 출전자는 기록에 남은 실제 출전 멤버 ID로만 판단한다. 지금의 라인업·계약·활동 멤버는 보지 않는다.
 *  - 세션은 characterId가 없으므로 세어지지 않는다.
 *  - 출전자를 알 수 없는 과거 기록(characterId가 없던 시절)은 건너뛴다. 없는 값을 지어내지 않는다.
 *  - 같은 공연은 한 번만 센다. 한 공연에서 같은 사람이 여러 칸에 적혀 있어도 마찬가지다.
 *  - 계약 기간과 무관하다. 재계약·포지션 변경·라인업 이탈로 지난 기록이 사라지지 않는다.
 *    (주전 기용 약속의 계약 구간 판정과는 다른 개념이다.)
 */
export function sharedPerformances(
  history: PerformanceSnapshot[],
  a: CharacterId,
  b: CharacterId,
): number {
  if (a === b) return 0; // 같은 사람끼리는 "함께 선 무대"가 성립하지 않는다
  const counted = new Set<string>();
  let shared = 0;
  history.forEach((snap) => {
    if (counted.has(snap.id)) return; // 같은 공연 기록은 한 번만
    counted.add(snap.id);
    const performers = performersOf(snap);
    if (performers === null) return;  // 출전자를 알 수 없는 기록
    const onStage = new Set<CharacterId>(performers);
    if (onStage.has(a) && onStage.has(b)) shared += 1;
  });
  return shared;
}

// ---------------------------------------------------------------- 라이브 호흡 (Phase 2B-1 V1)
/**
 * 두 사람이 함께 끝낸 공연 n회에서 나오는 쌍의 호흡. `n / (n + softness)`.
 * 초반에 빠르게 오르고 뒤로 갈수록 완만해진다. 1에는 닿지 않는다.
 */
export function pairFamiliarity(sharedShows: number): number {
  if (sharedShows <= 0) return 0;
  return sharedShows / (sharedShows + F.softness);
}

export interface LiveFamiliarity {
  /** 이번 무대에 서는 사람 수. 같은 고정 캐릭터가 중복 배치돼도 한 명으로 센다. */
  performers: number;
  /** 전체 쌍의 수 = m(m-1)/2. */
  pairs: number;
  /** 라인업 호흡 0..1. 모든 쌍의 호흡 평균이다. */
  value: number;
  /** 공연 점수에 더하는 가점. */
  bonus: number;
}

/**
 * 이번 공연에 실제로 서는 사람들의 명단.
 * 빈 슬롯과 대기 중인 멤버는 빠지고, 일반 세션은 익명이므로 각각 한 자리를 차지한다(null).
 */
function familiarityRoster(save: SaveData): (CharacterId | null)[] {
  const seen = new Set<CharacterId>();
  const roster: (CharacterId | null)[] = [];
  save.band.lineup.forEach((slot) => {
    const a = slot.assignment;
    if (!a) return;                          // 빈 슬롯
    if (a.kind === 'MEMBER') {
      if (seen.has(a.characterId)) return;   // 잘못 중복 배치돼도 한 사람
      seen.add(a.characterId);
      roster.push(a.characterId);
      return;
    }
    roster.push(null);                       // 일반 세션
  });
  return roster;
}

/**
 * 이번 공연 라인업의 라이브 호흡.
 *
 * **이번 공연 이전에 완료된 공연 기록만** 본다 (sharedPerformances). 준비 화면과 실제 결과가
 * 같은 값을 쓰므로, 첫 공동 공연의 보너스는 0이고 그 공연이 끝난 다음 공연부터 n = 1이 반영된다.
 * 고정 캐릭터 ID가 있는 사람은 그 ID의 공동 공연 이력을 쓰고, 익명 세션이 낀 쌍의 호흡은 0이다.
 * 저장하는 값은 없다. 기록에서 매번 다시 계산한다.
 */
export function liveFamiliarity(save: SaveData): LiveFamiliarity {
  const roster = familiarityRoster(save);
  const performers = roster.length;
  const pairs = (performers * (performers - 1)) / 2;
  if (pairs <= 0) return { performers, pairs: 0, value: 0, bonus: 0 };

  let total = 0;
  for (let i = 0; i < roster.length; i += 1) {
    for (let j = i + 1; j < roster.length; j += 1) {
      const a = roster[i];
      const b = roster[j];
      if (!a || !b) continue;                // 익명 세션이 낀 쌍은 0
      total += pairFamiliarity(sharedPerformances(save.performanceHistory, a, b));
    }
  }
  const value = total / pairs;               // 중간 계산은 반올림하지 않는다
  return { performers, pairs, value, bonus: F.maxBonus * value };
}
