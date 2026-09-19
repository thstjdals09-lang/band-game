// Weekly simulation engine (Character Master v1.1 §11: "주 진행 시 Simulation Engine이 일괄 처리").
//
// simulateWeek() is PURE: same save + same rng position always produces the same outcome.
// The Week Resolution screen shows exactly this object, and commitWeek() applies exactly this
// object once. Nothing is computed twice, so a reload can never pay a reward again.

import {
  ACTIVITIES, CHARACTERS, PROTOTYPE_BALANCE, VENUES,
  type CharacterId, type MainActionId, type VisibleStats,
} from '@/data/master';
import { isRecorded, isReleased } from '../save/schema';
import type { OpportunityState, SaveData, SongState } from '../save/schema';
import { effectiveExperience, stageForExperience, statGainsForStage } from './growth';
import { createRng, type Rng } from './rng';
import { createSong } from './song';
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
  /** Rehearsal slots spent preparing an existing song for the stage (v1 규칙 2). */
  rehearsal: { songId: string; title: string; slots: number } | null;
  /** The demo this week's recording slot turned into a releasable master (v1 규칙 3). */
  recording: { songId: string; title: string; cost: number } | null;
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
  // LIVE_SHOW is excluded: a booked-but-unplayed show must not bill the band, and a played show
  // already charged its production cost when it was performed (performanceActions.commit).
  // RECORDING is excluded here too and added back by the engine only when a demo was actually
  // recorded, so a slot that found no valid target bills nothing.
  const band = save.weeklyPlan.mainActions.reduce(
    (s, a) => s + (a && a !== 'LIVE_SHOW' && a !== 'RECORDING' ? activityDef(a)?.cost ?? 0 : 0), 0);
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

/**
 * Which song this week's rehearsal slots prepare (v1 규칙 2).
 * The band follows the song it is about to open with unless the player picked another one.
 * Only songs that already existed before this week can be a target (v1 규칙 5).
 */
export function resolveRehearsalTarget(save: SaveData): SongState | null {
  // 명세 §3·§5: 녹음·발매 여부와 관계없이 보유 곡은 무엇이든 합주할 수 있다.
  const playable = Object.values(save.songs);
  if (playable.length === 0) return null;
  const chosen = save.weeklyPlan.songWork.rehearsalSongId
    ? playable.find((s) => s.id === save.weeklyPlan.songWork.rehearsalSongId)
    : undefined;
  if (chosen) return chosen;
  const opening = save.pendingPerformance?.openingSongId
    ? playable.find((s) => s.id === save.pendingPerformance!.openingSongId)
    : undefined;
  if (opening) return opening;
  // No show booked and no explicit pick: the newest song the band is still working on.
  return [...playable].sort((a, b) => b.createdWeek - a.createdWeek)[0] ?? null;
}

/** A demo can be recorded when the room exists and the song is unreleased and not yet recorded. */
export function recordingCandidates(save: SaveData): SongState[] {
  if (!save.facilities.RECORDING_ROOM?.built) return [];
  return Object.values(save.songs).filter((s) => !isReleased(s.status) && !isRecorded(s));
}

/** What this week's recording slot actually finishes, if anything (v1 규칙 3). */
export function resolveRecording(save: SaveData): WeekOutcome['recording'] {
  if (!save.weeklyPlan.mainActions.includes('RECORDING')) return null;
  const targetId = save.weeklyPlan.songWork.recordingSongId;
  if (!targetId) return null;
  const song = recordingCandidates(save).find((s) => s.id === targetId);
  if (!song) return null;
  return { songId: song.id, title: song.title, cost: activityDef('RECORDING')?.cost ?? 0 };
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

  // 명세 §4: 실행 가능한 녹음 1회에 대해서만 비용과 컨디션 효과를 적용한다.
  const recording = resolveRecording(save);

  // A show is not a generic activity: its fatigue, experience and cost are applied by the
  // performance when it is actually played, so the slot alone changes nothing here.
  actions.forEach((action, index) => {
    const def = activityDef(action);
    const fx = B.activityEffects[action as keyof typeof B.activityEffects];
    if (!def || !fx) return;
    if (action === 'RECORDING' && !recording) return; // 실행되지 않은 녹음은 지치게 하지도 않는다
    if (action === 'LIVE_SHOW') {
      const snap = [...save.performanceHistory].reverse().find((p) => p.week === week);
      log.push(snap
        ? {
          kind: 'ACTIVITY', title: `${def.name} · ${snap.venueName}`,
          body: '무대에 올랐다.',
          effects: [`관객 ${snap.audience}명`, `수익 +${snap.revenue.toLocaleString('ko-KR')}원`, `팬 +${snap.fansDelta}`],
          assetKey: 'SCENE_LIVE_SHOW',
        }
        : {
          kind: 'ACTIVITY', title: def.name,
          body: '무대에 오르지 않은 채로 한 주가 지났다.',
          effects: ['예정된 공연이 그대로 남아 있다'],
          assetKey: 'SCENE_LIVE_SHOW',
        });
      return;
    }
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

  // ---------------------------------------------------------------- rehearsal slots -> song work
  // v1 규칙 1: a demo is only written when the band booked new-song work from the Songs screen,
  // and it costs one of this week's rehearsal slots.
  // v1 규칙 2: every other rehearsal slot prepares an existing song for the stage.
  // v1 규칙 5: targets are read from the plan as it stands now, so a song written this week can
  // never be rehearsed or recorded in the same week.
  const practiceSlots = actions.filter((a) => a === 'PRACTICE').length;
  const wantsNewSong = plan.songWork.newSong && practiceSlots > 0 && members.length > 0;

  let newSong: WeekOutcome['newSong'] = null;
  if (wantsNewSong) {
    const created = createSong({ save, origin: 'PRACTICE', week, rng });
    if (created) {
      newSong = { ...created.song, composerId: created.composerId };
      log.push({
        kind: 'SONG',
        title: created.song.title,
        body: '합주 중에 형태를 잡았다.',
        effects: [
          `대중성 ${created.song.musicProfile.popularity}`,
          `음악성 ${created.song.musicProfile.artistry}`,
          `라이브 ${created.song.musicProfile.liveFit}`,
          '아직 녹음 전이라 발매할 수 없다',
        ],
        assetKey: 'SONG_REVEAL',
      });
    }
  } else if (plan.songWork.newSong && practiceSlots === 0) {
    log.push({
      kind: 'SONG', title: '새 곡 작업',
      body: '새 곡을 쓰기로 해 놓고 합주를 넣지 않았다.',
      effects: ['합주 슬롯이 있어야 데모가 나온다'],
    });
  }

  const rehearsalSlots = practiceSlots - (wantsNewSong ? 1 : 0);
  const rehearsalTarget = rehearsalSlots > 0 ? resolveRehearsalTarget(save) : null;
  const rehearsal: WeekOutcome['rehearsal'] = rehearsalTarget
    ? { songId: rehearsalTarget.id, title: rehearsalTarget.title, slots: rehearsalSlots }
    : null;
  if (rehearsal) {
    log.push({
      kind: 'SONG', title: `공연 준비 · ${rehearsal.title}`,
      body: '무대에 올릴 곡을 반복해서 맞췄다.',
      effects: [`합주 ${rehearsal.slots}회`, '숙련도 수치는 아직 정해지지 않았다'],
    });
  } else if (!plan.songWork.newSong && practiceSlots > 0) {
    // 합주는 했는데 새 곡 작업 예약도, 맞춰볼 곡도 없었다. 왜 곡이 안 나왔는지 알려준다.
    log.push({
      kind: 'SONG', title: '합주',
      body: '맞춰볼 곡이 아직 없어 기본기만 다졌다.',
      effects: ['멤버 성장에만 쓰였다', '곡 화면에서 새 곡 작업을 예약하면 다음 합주에서 데모가 나온다'],
    });
  }

  // ---------------------------------------------------------------- recording (v1 규칙 3)
  if (recording) {
    log.push({
      kind: 'SONG', title: `녹음 완료 · ${recording.title}`,
      body: '데모를 음원으로 다듬었다.',
      effects: ['이제 발매할 수 있다'],
    });
  } else if (actions.includes('RECORDING')) {
    log.push({
      kind: 'SONG', title: '녹음',
      body: '녹음할 곡을 정하지 않아 콘솔만 켜 두었다.',
      effects: ['녹음 비용은 청구되지 않았다'],
    });
  }

  // ---------------------------------------------------------------- fans from promotion
  let fansDelta = 0;
  let fanLoyaltyDelta = 0;
  // Promotion pays per slot: two promotion slots cost twice and tire the band twice, so they
  // must also reach twice as many people. The per-slot numbers themselves are unchanged.
  const promotionSlots = actions.filter((a) => a === 'PROMOTION').length;
  if (promotionSlots > 0 && members.length > 0) {
    const starPower = members.reduce((a, id) => {
      const st = save.characterStates[id];
      const stats = { ...CHARACTERS[id].visibleStats, ...st?.currentStats };
      return a + stats.star;
    }, 0) / members.length;
    const perSlot = Math.round(B.promotion.baseFans + starPower * B.promotion.starPowerFactor);
    fansDelta = perSlot * promotionSlots;
    fanLoyaltyDelta = B.promotion.fanLoyaltyGain * promotionSlots;
    log.push({
      kind: 'ACTIVITY', title: '홍보 결과', body: '이름을 알렸다.',
      effects: promotionSlots > 1 ? [`팬 +${fansDelta}`, `홍보 ${promotionSlots}회`] : [`팬 +${fansDelta}`],
    });
  }

  // ---------------------------------------------------------------- money
  const expense = projectedExpenseOf(save) + (recording?.cost ?? 0);
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
    rehearsal,
    recording,
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
