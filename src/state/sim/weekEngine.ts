// Weekly simulation engine (Character Master v1.1 §11: "주 진행 시 Simulation Engine이 일괄 처리").
//
// simulateWeek() is PURE: same save + same rng position always produces the same outcome.
// The Week Resolution screen shows exactly this object, and commitWeek() applies exactly this
// object once. Nothing is computed twice, so a reload can never pay a reward again.

import {
  ACTIVITIES, CHARACTERS, PROTOTYPE_BALANCE, VENUES,
  type CharacterId, type MainActionId, type VisibleStats,
} from '@/data/master';
import type { OpportunityState, SaveData, SongState } from '../save/schema';
import { effectiveExperience, stageForExperience, statGainsForStage } from './growth';
import { createRng, type Rng } from './rng';
import { createSong, createsSong } from './song';
import { achievedMilestones, careerTierFor } from './career';

const B = PROTOTYPE_BALANCE;
const STAT_KEYS: (keyof VisibleStats)[] = ['skill', 'creative', 'stage', 'star', 'pro'];

export interface MemberWeekDelta {
  characterId: CharacterId;
  energy: number;
  stress: number;
  morale: number;
  experience: number;
  personalPopularity: number;
  statGains: Partial<VisibleStats>;
  stageBefore: number;
  stageAfter: number;
  /** Why this member learned less than the raw activity value. */
  limited: 'TIRED' | 'STRESSED' | null;
}

export interface WeekLogEntry {
  kind: 'ACTIVITY' | 'INDIVIDUAL' | 'GROWTH' | 'SONG' | 'RELEASE_INCOME' | 'OFFER' | 'SUMMARY';
  title: string;
  body?: string;
  effects: string[];
  assetKey?: string;
}

export interface WeekOutcome {
  /** The week this outcome was computed for; commitWeek refuses to apply a stale one. */
  week: number;
  year: number;
  rngPosition: number;
  expense: number;
  musicIncome: number;
  members: MemberWeekDelta[];
  newSong: (Omit<SongState, 'id'> & { composerId?: CharacterId }) | null;
  fansDelta: number;
  fanLoyaltyDelta: number;
  newOffers: Omit<OpportunityState, 'id'>[];
  log: WeekLogEntry[];
}

const activityDef = (id: MainActionId) => ACTIVITIES.find((a) => a.scope === 'BAND' && a.id === id);

/** Weekly streaming income from everything already released (GDD §05 음원/앨범 수익 단계). */
export function weeklyMusicIncome(save: SaveData): number {
  const week = save.world.week + (save.world.year - 1) * 52;
  return Object.values(save.releases).reduce((total, rel) => {
    const releasedAbs = rel.releasedWeek;
    const age = Math.max(0, week - releasedAbs);
    if (age > B.release.weeklyIncomeWeeks) return total;
    const popularity = rel.songIds.reduce((a, id) => a + (save.songs[id]?.musicProfile.popularity ?? 0), 0);
    const decay = B.release.weeklyIncomeDecay ** age;
    return total + popularity * B.release.weeklyIncomePerPopularity * decay / 100;
  }, 0);
}

function projectedExpenseOf(save: SaveData): number {
  const salaries = Object.values(save.contracts).reduce((s, c) => s + (c?.salary ?? 0), 0);
  const sessions = Object.values(save.sessionHires).reduce((s, h) => s + h.weeklyCost, 0);
  const band = save.weeklyPlan.mainActions.reduce((s, a) => s + (a ? activityDef(a)?.cost ?? 0 : 0), 0);
  const individual = save.weeklyPlan.individualActions.reduce((s, ia) => {
    const def = ACTIVITIES.find((x) => x.scope === 'INDIVIDUAL' && x.id === ia.actionId);
    return s + (def?.cost ?? 0);
  }, 0);
  return salaries + sessions + band + individual;
}

/** Stamina softens fatigue; a tour engine like C10 burns far slower than C11. */
function energyFactor(id: CharacterId): number {
  return 1 - (CHARACTERS[id].hiddenStats.stamina - 60) / 260;
}

export function simulateWeek(save: SaveData): WeekOutcome {
  const week = save.world.week;
  const year = save.world.year;
  const rngPosition = save.rng.streams.world;
  const rng: Rng = createRng(save.rng.baseSeed, 'world', rngPosition);

  const plan = save.weeklyPlan;
  const actions = plan.mainActions.filter(Boolean) as MainActionId[];
  const members = save.band.activeMembers;
  const log: WeekLogEntry[] = [];

  // ---------------------------------------------------------------- per member accumulation
  const deltas = new Map<CharacterId, MemberWeekDelta>();
  members.forEach((id) => {
    const st = save.characterStates[id];
    deltas.set(id, {
      characterId: id, energy: 0, stress: 0, morale: 0, experience: 0, personalPopularity: 0,
      statGains: {}, stageBefore: st?.growth.developmentStage ?? 0, stageAfter: st?.growth.developmentStage ?? 0,
      limited: null,
    });
  });

  actions.forEach((action, index) => {
    const def = activityDef(action);
    const fx = B.activityEffects[action as keyof typeof B.activityEffects];
    if (!def || !fx) return;
    members.forEach((id) => {
      const d = deltas.get(id);
      if (!d) return;
      d.energy += fx.energy * (fx.energy < 0 ? energyFactor(id) : 1);
      d.stress += fx.stress;
      d.morale += fx.morale;
      d.experience += fx.experience;
    });
    log.push({
      kind: 'ACTIVITY',
      title: def.name,
      body: def.summary,
      effects: def.affects,
      assetKey: `SCENE_${action}`,
    });
    void index;
  });

  plan.individualActions.forEach((ia) => {
    const def = ACTIVITIES.find((x) => x.scope === 'INDIVIDUAL' && x.id === ia.actionId);
    const fx = B.individualEffects[ia.actionId as keyof typeof B.individualEffects];
    const d = deltas.get(ia.characterId);
    if (!def || !fx || !d) return;
    d.energy += fx.energy * (fx.energy < 0 ? energyFactor(ia.characterId) : 1);
    d.stress += fx.stress;
    d.morale += fx.morale;
    d.experience += fx.experience;
    if ('personalPopularity' in fx) d.personalPopularity += (fx as { personalPopularity: number }).personalPopularity;
    log.push({
      kind: 'INDIVIDUAL',
      title: `${CHARACTERS[ia.characterId].name} · ${def.name}`,
      body: def.summary,
      effects: def.affects,
      assetKey: `SCENE_INDIVIDUAL_${ia.actionId}`,
    });
  });

  // ---------------------------------------------------------------- growth resolution
  const growthLines: string[] = [];
  deltas.forEach((d, id) => {
    const st = save.characterStates[id];
    if (!st) return;
    const condition = st.condition;
    const raw = d.experience;
    const gained = effectiveExperience(raw, condition);
    if (gained < raw) d.limited = condition.energy < B.growth.lowEnergyThreshold ? 'TIRED' : 'STRESSED';
    d.experience = gained;

    const totalExp = st.growth.experience + gained;
    const stageAfter = stageForExperience(totalExp);
    d.stageAfter = stageAfter;

    if (stageAfter > d.stageBefore) {
      const current: VisibleStats = { ...CHARACTERS[id].visibleStats, ...st.currentStats };
      for (let s = d.stageBefore + 1; s <= stageAfter; s += 1) {
        const { gains } = statGainsForStage(id, s, { ...current, ...applyGains(current, d.statGains) });
        STAT_KEYS.forEach((k) => {
          const add = gains[k];
          if (!add) return;
          d.statGains[k] = (d.statGains[k] ?? 0) + add;
        });
      }
      const summary = STAT_KEYS
        .filter((k) => d.statGains[k])
        .map((k) => `${statLabel(k)} +${d.statGains[k]}`)
        .join(' · ');
      growthLines.push(`${CHARACTERS[id].name} ${d.stageBefore}→${stageAfter}단계${summary ? ` · ${summary}` : ''}`);
    }
  });
  if (growthLines.length > 0) {
    log.push({ kind: 'GROWTH', title: '성장', body: '이번 주 훈련이 실력으로 남았다.', effects: growthLines });
  }

  // ---------------------------------------------------------------- song
  const creativeAction = createsSong(plan.mainActions);
  let newSong: WeekOutcome['newSong'] = null;
  if (creativeAction && members.length > 0) {
    const created = createSong({ save, origin: creativeAction, week, rng });
    if (created) {
      newSong = { ...created.song, composerId: created.composerId };
      log.push({
        kind: 'SONG',
        title: created.song.title,
        body: created.song.originContext.includes('RECORDING_SESSION') ? '녹음 중에 형태를 잡았다.' : '합주 중에 형태를 잡았다.',
        effects: [
          `대중성 ${created.song.musicProfile.popularity}`,
          `음악성 ${created.song.musicProfile.artistry}`,
          `라이브 ${created.song.musicProfile.liveFit}`,
        ],
        assetKey: 'SONG_REVEAL',
      });
    }
  }

  // ---------------------------------------------------------------- fans from promotion
  let fansDelta = 0;
  let fanLoyaltyDelta = 0;
  if (actions.includes('PROMOTION') && members.length > 0) {
    const starPower = members.reduce((a, id) => {
      const st = save.characterStates[id];
      const stats = { ...CHARACTERS[id].visibleStats, ...st?.currentStats };
      return a + stats.star;
    }, 0) / members.length;
    fansDelta = Math.round(B.promotion.baseFans + starPower * B.promotion.starPowerFactor);
    fanLoyaltyDelta = B.promotion.fanLoyaltyGain;
    log.push({
      kind: 'ACTIVITY', title: '홍보 결과', body: '이름을 알렸다.',
      effects: [`팬 +${fansDelta}`],
    });
  }

  // ---------------------------------------------------------------- money
  const expense = projectedExpenseOf(save);
  const musicIncome = Math.round(weeklyMusicIncome(save));
  if (musicIncome > 0) {
    log.push({ kind: 'RELEASE_INCOME', title: '음원 수익', body: '발매한 곡이 계속 재생되고 있다.', effects: [`+${musicIncome.toLocaleString('ko-KR')}원`] });
  }

  // ---------------------------------------------------------------- live offers
  const newOffers = buildLiveOffers(save, week, fansDelta);
  newOffers.forEach((o) => {
    log.push({ kind: 'OFFER', title: o.title, body: o.description, effects: [] });
  });

  return {
    week, year, rngPosition,
    expense, musicIncome,
    members: [...deltas.values()],
    newSong,
    fansDelta, fanLoyaltyDelta,
    newOffers,
    log,
  };
}

function applyGains(base: VisibleStats, gains: Partial<VisibleStats>): VisibleStats {
  const out = { ...base };
  STAT_KEYS.forEach((k) => { out[k] = Math.min(100, out[k] + (gains[k] ?? 0)); });
  return out;
}

export function statLabel(k: keyof VisibleStats): string {
  return { skill: '실력', creative: '창의성', stage: '무대력', star: '스타성', pro: '프로의식' }[k];
}

/**
 * Recurring live offers. The one-shot prototype guard is gone: offers keep arriving once the band
 * has songs, is not already booked, and has waited out the cooldown after its last show.
 * Venue choice follows fans vs capacity (GDD §07: 동네 → 도시로 활동 범위가 넓어진다).
 */
export function buildLiveOffers(save: SaveData, week: number, incomingFans = 0): Omit<OpportunityState, 'id'>[] {
  if (save.band.activeMembers.length === 0) return [];
  if (save.pendingPerformance) return [];
  const songCount = Object.keys(save.songs).length;
  if (songCount < B.songs.minSongsForDebut) return [];

  const openLive = Object.values(save.opportunities).some(
    (o) => o.type === 'LIVE' && (o.status === 'NEW' || o.status === 'SEEN' || o.status === 'LATER'),
  );
  if (openLive) return [];

  const lastShowWeek = save.performanceHistory.length
    ? save.performanceHistory[save.performanceHistory.length - 1].week
    : -Infinity;
  if (week - lastShowWeek < B.liveOffer.cooldownWeeks) return [];

  const fans = save.band.metrics.fans + incomingFans;
  const bigVenue = fans >= B.liveOffer.moonlightClubFans;
  const venue = bigVenue ? VENUES.MOONLIGHT_CLUB : VENUES.BASEMENT_CLUB;
  const first = save.performanceHistory.length === 0;
  const createdWeek = week + B.opportunity.liveOfferDelayWeeks;

  return [{
    type: 'LIVE',
    title: `${venue.name} ${first ? '공연 제안' : '재섭외'}`,
    description: first
      ? `${venue.name}에서 데뷔 무대를 제안했다.`
      : `${venue.name}에서 다시 불러 주었다. 수용 ${venue.capacity}명.`,
    createdWeek,
    expiresWeek: createdWeek + B.opportunity.liveOfferWindowWeeks,
    status: 'NEW',
    payload: { venueId: venue.id },
  }];
}

/** Milestones/tier after a week is applied - used for the summary card. */
export function careerAfter(save: SaveData) {
  return { tier: careerTierFor(save), reached: achievedMilestones(save) };
}
