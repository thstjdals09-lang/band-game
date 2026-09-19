// Performance result (IA v1.1 §19: "결과는 캐릭터/곡/준비/컨디션/관계/장비 등의 누적 상태를
// 중심으로 계산하고 랜덤은 보조로 사용한다").
//
// Implemented inputs: 멤버 실력·무대력·라이브 안정성, 오프닝 곡 라이브 적합도, 준비도(컨디션),
// 공연장 규모, 무대 위 순간 선택, 보조 랜덤.
// NOT implemented: 관계, 장비 -> PHASE 2B / 후속. They are absent, not faked.

import { CHARACTERS, PROTOTYPE_BALANCE, VENUES, type CharacterId } from '@/data/master';
import type { PerformanceSnapshot, SaveData } from '../save/schema';
import { createRng } from './rng';

const P = PROTOTYPE_BALANCE.performance;
const W = PROTOTYPE_BALANCE.performanceScore;

export interface PerformanceInputs {
  /** 0..100 each, so the weighted score is readable. */
  skill: number;
  stagePresence: number;
  songLiveFit: number;
  condition: number;
  liveStability: number;
  /** Crowd reaction earned by the moment choices. */
  choiceBonus: number;
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
  return Math.max(0, Math.min(100, base + i.choiceBonus + i.random));
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
