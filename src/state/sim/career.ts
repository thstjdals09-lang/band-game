// Career progression (GDD v0.2 §07) and facility unlocks (IA §22).
//
// Milestones are DERIVED from history, not stored: Character Master §14 says recomputable state
// is recomputed and only finished history is snapshotted - and history is exactly what we read.

import {
  CAREER_TIERS, CAREER_TIER_ORDER, FACILITIES, MILESTONES, PROTOTYPE_BALANCE, REVENUE_STREAMS,
  VENUES, type CareerTierId, type MilestoneId, type RevenueStreamId,
} from '@/data/master';
import type { SaveData } from '../save/schema';

/** Which milestones the band has already reached, read back from its own history. */
export function achievedMilestones(save: SaveData): Set<MilestoneId> {
  const out = new Set<MilestoneId>();
  if (save.performanceHistory.length > 0) out.add('FIRST_SHOW');

  const soldOut = save.performanceHistory.some((p) => {
    const cap = VENUES[p.venueId]?.capacity;
    return typeof cap === 'number' && p.audience >= cap;
  });
  if (soldOut) out.add('FIRST_SELLOUT');

  if (Object.keys(save.releases).length > 0) out.add('FIRST_RELEASE');
  if (save.band.metrics.fans >= PROTOTYPE_BALANCE.career.localFanbaseFans) out.add('LOCAL_FANBASE');

  // "기본 시설 확장" - any facility built beyond the starting rehearsal room.
  const builtExtra = Object.values(save.facilities).some((f) => f.built && f.facilityId !== 'REHEARSAL_ROOM');
  if (builtExtra) out.add('FIRST_FACILITY');

  return out;
}

/** Highest tier whose requirements are all met, walking up from UNKNOWN. */
export function careerTierFor(save: SaveData): CareerTierId {
  const reached = achievedMilestones(save);
  let tier: CareerTierId = 'UNKNOWN';
  CAREER_TIER_ORDER.forEach((id) => {
    const def = CAREER_TIERS[id];
    if (def.order === 0) return;
    if (CAREER_TIERS[tier].order + 1 !== def.order) return; // no skipping tiers
    if (def.requires.every((m) => reached.has(m))) tier = id;
  });
  return tier;
}

export interface CareerProgress {
  tier: CareerTierId;
  reached: Set<MilestoneId>;
  /** Milestones still missing for the next tier, in document order. */
  nextTier: CareerTierId | null;
  missingForNext: MilestoneId[];
}

export function careerProgress(save: SaveData): CareerProgress {
  const reached = achievedMilestones(save);
  const tier = careerTierFor(save);
  const nextOrder = CAREER_TIERS[tier].order + 1;
  const nextTier = CAREER_TIER_ORDER.find((id) => CAREER_TIERS[id].order === nextOrder) ?? null;
  const missingForNext = nextTier ? CAREER_TIERS[nextTier].requires.filter((m) => !reached.has(m)) : [];
  return { tier, reached, nextTier, missingForNext };
}

export function milestoneLabel(id: MilestoneId): string {
  return MILESTONES[id]?.label ?? id;
}

/** Revenue streams open right now (GDD §05 수익 해금 단계). */
export function unlockedRevenueStreams(save: SaveData): RevenueStreamId[] {
  const reached = achievedMilestones(save);
  return (Object.keys(REVENUE_STREAMS) as RevenueStreamId[])
    .filter((id) => {
      const def = REVENUE_STREAMS[id];
      return !def.unlockedBy || reached.has(def.unlockedBy);
    })
    .sort((a, b) => REVENUE_STREAMS[a].order - REVENUE_STREAMS[b].order);
}

export type FacilityAvailability = 'BUILT' | 'AVAILABLE' | 'LOCKED';

/** Data-driven facility gate; replaces the old hard-coded rule but keeps its behaviour. */
export function facilityAvailabilityFor(save: SaveData, facilityId: string): FacilityAvailability {
  const state = save.facilities[facilityId];
  if (state?.built) return 'BUILT';
  const def = FACILITIES[facilityId];
  if (!def) return 'LOCKED';

  switch (def.unlock.kind) {
    case 'ALWAYS':
      return 'AVAILABLE';
    case 'MILESTONE':
      return achievedMilestones(save).has(def.unlock.milestoneId as MilestoneId) ? 'AVAILABLE' : 'LOCKED';
    case 'CAREER_TIER': {
      const required = CAREER_TIERS[def.unlock.tierId].order;
      return CAREER_TIERS[careerTierFor(save)].order >= required ? 'AVAILABLE' : 'LOCKED';
    }
    default:
      return 'LOCKED';
  }
}

/** Activities a facility has unlocked (GDD §05: 녹음실이 있어야 녹음한다). */
export function activityUnlocked(save: SaveData, actionId: string): boolean {
  const gate = Object.values(FACILITIES).find((f) => f.enablesActivity === actionId);
  if (!gate) return true;
  return !!save.facilities[gate.id]?.built;
}
