// Member growth (Character Master v1.1 §04 growthProfile: overallPotential / curve / statBias).
// The doc names the curves; the magnitudes are TODO(balance) in PROTOTYPE_BALANCE.

import { CHARACTERS, PROTOTYPE_BALANCE, type CharacterId, type GrowthCurve, type VisibleStats } from '@/data/master';
import type { CharacterState } from '../save/schema';

const G = PROTOTYPE_BALANCE.growth;
const STAT_KEYS: (keyof VisibleStats)[] = ['skill', 'creative', 'stage', 'star', 'pro'];

/**
 * How strongly a curve grows at a given development stage (0 = rookie).
 * Shapes follow the names Character Master uses; the exact values are TODO(balance).
 */
export function growthMultiplier(curve: GrowthCurve, stage: number): number {
  const early = Math.max(0, 1 - stage / 6);
  const late = Math.min(1, stage / 6);
  switch (curve) {
    case 'EARLY_FAST': return 0.6 + early * 0.9;
    case 'LATE_EXPONENTIAL': return 0.35 + late * late * 1.6;
    case 'MID_BLOOM': return 0.5 + Math.sin(Math.min(1, stage / 8) * Math.PI) * 1.1;
    case 'HIGH_START': return 1.2 - late * 0.4;
    case 'HIGH_START_SLOW': return 1.15 - late * 0.7;
    case 'BALANCED_HIGH': return 1.15;
    case 'BALANCED': return 1;
    case 'STABLE': return 0.9;
    case 'PLATEAU': return Math.max(0.15, 1.1 - stage * 0.22);
    case 'BURST': return stage % 3 === 0 ? 1.9 : 0.6;
    case 'VETERAN': return Math.max(0.2, 0.8 - stage * 0.1);
    case 'LATE_BRANCHING': return 0.4 + late * 1.5;
    default: return 1;
  }
}

/** Experience a member actually banks this week, reduced when tired or stressed. */
export function effectiveExperience(base: number, condition: CharacterState['condition']): number {
  if (base <= 0) return 0;
  let value = base;
  if (condition.energy < G.lowEnergyThreshold) value *= G.lowEnergyExperienceFactor;
  if (condition.stress > G.highStressThreshold) value *= G.highStressExperienceFactor;
  return Math.round(value);
}

export function stageForExperience(experience: number): number {
  return Math.min(G.maxDevelopmentStage, Math.floor(experience / G.experiencePerStage));
}

export interface StatGainResult {
  gains: Partial<VisibleStats>;
  /** Stat total actually added, for the week summary. */
  total: number;
}

/**
 * Distribute stat points for one development stage.
 * Head-room against overallPotential decides how much is left to gain, statBias where it goes.
 */
export function statGainsForStage(
  id: CharacterId,
  stage: number,
  current: VisibleStats,
): StatGainResult {
  const def = CHARACTERS[id];
  const potential = def.growthProfile.overallPotential;
  const budget = G.statPointsPerStage * growthMultiplier(def.growthProfile.curve, stage);

  // Weight by remaining head-room so a member near their ceiling barely moves.
  const headroom = STAT_KEYS.map((k) => Math.max(0, potential - G.potentialSoftCapMargin - current[k]));
  const bias = STAT_KEYS.map((k) => def.growthProfile.statBias?.[k] ?? 1);
  const weights = headroom.map((h, i) => h * bias[i]);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return { gains: {}, total: 0 };

  const gains: Partial<VisibleStats> = {};
  let total = 0;
  STAT_KEYS.forEach((k, i) => {
    const share = (weights[i] / sum) * budget;
    const add = Math.round(share);
    if (add <= 0) return;
    const capped = Math.min(add, Math.max(0, potential - current[k]));
    if (capped <= 0) return;
    gains[k] = capped;
    total += capped;
  });
  return { gains, total };
}

/**
 * Bank raw experience on one member and resolve any development stages it unlocks.
 * Shared by the weekly engine and by a finished performance so growth works the same way
 * wherever the experience came from.
 */
export function grantExperience(
  state: CharacterState,
  characterId: CharacterId,
  rawExperience: number,
  conditionAtTheTime: CharacterState['condition'] = state.condition,
): { gained: number; stageBefore: number; stageAfter: number; statGains: Partial<VisibleStats> } {
  const gained = effectiveExperience(rawExperience, conditionAtTheTime);
  const stageBefore = state.growth.developmentStage;
  state.growth.experience += gained;
  const stageAfter = stageForExperience(state.growth.experience);
  state.growth.developmentStage = stageAfter;

  const statGains: Partial<VisibleStats> = {};
  for (let stage = stageBefore + 1; stage <= stageAfter; stage += 1) {
    const current: VisibleStats = { ...CHARACTERS[characterId].visibleStats, ...state.currentStats };
    const { gains } = statGainsForStage(characterId, stage, current);
    STAT_KEYS.forEach((k) => {
      const add = gains[k];
      if (!add) return;
      statGains[k] = (statGains[k] ?? 0) + add;
      state.currentStats[k] = Math.min(100, (state.currentStats[k] ?? CHARACTERS[characterId].visibleStats[k]) + add);
    });
  }
  return { gained, stageBefore, stageAfter, statGains };
}

export function clampCondition(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
