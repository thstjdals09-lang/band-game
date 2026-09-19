// Domain actions - the only place that mutates SaveData. UI calls these; simulation depth is PHASE 2+.
// All numeric tuning lives in PROTOTYPE_BALANCE (TODO(balance)).
import {
  ACTIVITIES, CAREER_TIERS, CHARACTERS, CONTRACT_PROFILES, FACILITIES, MILESTONES, PROTOTYPE_BALANCE,
  RELEASE_FORMATS, SESSION_TEMPLATES,
  type CharacterId, type IndividualActionId, type MainActionId, type MilestoneId,
  type ReleaseKind, type SlotId,
} from '@/data/master';
import { useGameStore } from '../store';
import { firstEmptyCompatibleSlotIndex } from '../selectors';
import { achievedMilestones, careerTierFor } from '../sim/career';
import { clampCondition, grantExperience, stageForExperience } from '../sim/growth';
import { absoluteWeek, acceptsTerms, nearestDurationOption, renewalOpen, settleContracts } from '../sim/contract';
import type { WeekOutcome } from '../sim/weekEngine';
import { isRecorded, isReleased } from '../save/schema';
import type { CareerTier, LineupAssignment, PerformanceSnapshot, RevealKey, SaveData, SongStatus } from '../save/schema';

const B = PROTOTYPE_BALANCE;
const update = (fn: (d: SaveData) => void) => useGameStore.getState().update(fn);
const pad = (n: number) => String(n).padStart(5, '0');

/** A track carries the format it was released in, so an EP is not recorded as a single. */
const RELEASED_STATUS_BY_FORMAT: Record<ReleaseKind, SongStatus> = {
  SINGLE: 'RELEASED_SINGLE', EP: 'RELEASED_EP', ALBUM: 'RELEASED_ALBUM',
};

/** Fatigue softening by stamina, matching the weekly engine. */
const energyFactorOf = (id: CharacterId) => 1 - (CHARACTERS[id].hiddenStats.stamina - 60) / 260;

// ---------------------------------------------------------------- Audition
export const auditionActions = {
  toggleShortlist(auditionId: string, id: CharacterId) {
    update((d) => {
      const a = d.auditions[auditionId];
      if (!a) return;
      if (a.shortlistIds.includes(id)) {
        a.shortlistIds = a.shortlistIds.filter((x) => x !== id);
        a.compareIds = a.compareIds.filter((x) => x !== id);
      } else {
        a.shortlistIds.push(id);
      }
    });
  },
  setCompare(auditionId: string, ids: CharacterId[]) {
    update((d) => { const a = d.auditions[auditionId]; if (a) a.compareIds = ids.slice(0, 3); });
  },
  investigate(auditionId: string, id: CharacterId, key: RevealKey) {
    update((d) => {
      const a = d.auditions[auditionId];
      if (!a) return;
      const list = a.revealedInformation[id] ?? [];
      if (!list.includes(key)) list.push(key);
      if (key === 'INTERVIEW' && !list.includes('TRAIT_2')) list.push('TRAIT_2');
      a.revealedInformation[id] = list;
      // TODO(PHASE2): investigation should consume a weekly action / cost (GDD §04).
    });
  },
  /** Contract ACCEPT: character becomes PLAYER_MEMBER and is auto-assigned to the first empty compatible slot (if any). */
  signContract(auditionId: string, id: CharacterId, terms: { salary: number; durationWeeks: number; rolePromise: 'CORE_MEMBER' | 'SUPPORT_MEMBER' }) {
    update((d) => {
      const week = d.world.week;
      const cs = d.characterStates[id];
      if (cs) { cs.worldStatus = 'PLAYER_MEMBER'; cs.joinedWeek = week; }
      if (!d.band.activeMembers.includes(id)) d.band.activeMembers.push(id);
      const profile = CONTRACT_PROFILES[CHARACTERS[id].contractProfileId];
      // 계약 주차는 절대 주차로 기록한다 (연도를 넘어가도 주수가 어긋나지 않는다).
      const abs = absoluteWeek(d.world);
      d.contracts[id] = {
        characterId: id, salary: terms.salary, startWeek: abs, endWeek: abs + terms.durationWeeks - 1,
        rolePromise: terms.rolePromise, clauses: profile?.clauses ?? [], satisfaction: B.contract.initialSatisfaction,
        renewal: null, pendingChange: null,
      };
      const idx = firstEmptyCompatibleSlotIndex(d, id);
      if (idx >= 0) d.band.lineup[idx].assignment = { kind: 'MEMBER', characterId: id };
      if (!d.band.officialLeaderCharacterId) d.band.officialLeaderCharacterId = id;
      const a = d.auditions[auditionId];
      if (a) {
        a.candidateIds = a.candidateIds.filter((x) => x !== id);
        a.shortlistIds = a.shortlistIds.filter((x) => x !== id);
        a.compareIds = a.compareIds.filter((x) => x !== id);
      }
      d.careerHistory.push({ week, type: 'CONTRACT', text: `${CHARACTERS[id].name} 영입 (${terms.durationWeeks}주 계약)` });
    });
  },
};

// ---------------------------------------------------------------- Band / Lineup (variable slot list)
export const bandActions = {
  /** Assign to lineup slot by index. A member occupies at most one slot; replacing a session ends it. */
  assignSlot(index: number, assignment: LineupAssignment | null) {
    update((d) => {
      const slot = d.band.lineup[index];
      if (!slot) return;
      if (assignment?.kind === 'MEMBER') {
        d.band.lineup.forEach((s) => {
          if (s.assignment?.kind === 'MEMBER' && s.assignment.characterId === assignment.characterId) s.assignment = null;
        });
      }
      if (slot.assignment?.kind === 'SESSION') delete d.sessionHires[slot.assignment.instanceId];
      slot.assignment = assignment;
    });
  },
  hireSession(index: number, templateId: string) {
    update((d) => {
      const slot = d.band.lineup[index];
      const tpl = SESSION_TEMPLATES.find((t) => t.templateId === templateId);
      if (!slot || !tpl) return;
      d.counters.session += 1;
      const instanceId = `session_${pad(d.counters.session)}`;
      d.sessionHires[instanceId] = {
        instanceId, templateId, slot: slot.slotId, hiredWeek: d.world.week, endWeek: d.world.week + tpl.durationWeeks, weeklyCost: tpl.weeklyCost,
      };
      if (slot.assignment?.kind === 'SESSION') delete d.sessionHires[slot.assignment.instanceId];
      slot.assignment = { kind: 'SESSION', instanceId };
    });
  },
  /** Structure only (no UI yet): append an expansion position to the band's lineup. PHASE 2+ feature entry point. */
  addLineupSlot(slotId: SlotId) {
    update((d) => {
      d.band.lineup.push({ slotId, assignment: null });
      d.careerHistory.push({ week: d.world.week, type: 'LINEUP_CHANGE', text: `${slotId} 포지션 추가` });
    });
  },
  setLeader(id: CharacterId) {
    update((d) => { d.band.officialLeaderCharacterId = id; });
  },
  setBandName(name: string) {
    update((d) => {
      d.band.name = name.trim() || d.band.name;
      d.careerHistory.push({ week: d.world.week, type: 'BAND', text: `밴드 이름을 정했다: ${d.band.name}` });
    });
  },
};

// ---------------------------------------------------------------- Schedule
export const scheduleActions = {
  setMainAction(index: number, actionId: MainActionId | null) {
    update((d) => {
      // 명세 §4: 한 주에 녹음 슬롯은 하나뿐이고, 두 번째는 아예 배치할 수 없다.
      // (화면에서도 잠기지만, 계획을 바꾸는 유일한 통로인 여기서도 막는다.)
      if (actionId === 'RECORDING' && d.weeklyPlan.mainActions.some((a, i) => i !== index && a === 'RECORDING')) return;
      // 녹음 대상이 없으면 녹음 슬롯 자체를 배치하지 않는다.
      if (actionId === 'RECORDING') {
        const target = d.weeklyPlan.songWork.recordingSongId ? d.songs[d.weeklyPlan.songWork.recordingSongId] : null;
        if (!target || isRecorded(target) || isReleased(target.status) || !d.facilities.RECORDING_ROOM?.built) return;
      }
      d.weeklyPlan.mainActions[index] = actionId;
    });
  },
  /** Book (or cancel) new-song work for this week, from the Songs screen (v1 규칙 1). */
  setNewSongWork(on: boolean) {
    update((d) => { d.weeklyPlan.songWork.newSong = on; });
  },
  /** Choose which existing song the rehearsal slots prepare; null follows the opening song. */
  setRehearsalSong(songId: string | null) {
    update((d) => { d.weeklyPlan.songWork.rehearsalSongId = songId; });
  },
  /** Choose the demo the recording slot finishes; null leaves the console idle. */
  setRecordingSong(songId: string | null) {
    update((d) => { d.weeklyPlan.songWork.recordingSongId = songId; });
  },
  setIndividualAction(index: number, plan: { characterId: CharacterId; actionId: IndividualActionId } | null) {
    update((d) => {
      const list = d.weeklyPlan.individualActions;
      if (plan) list[index] = plan; else list.splice(index, 1);
      d.weeklyPlan.individualActions = list.slice(0, 2);
    });
  },
  /**
   * Apply ONE already-simulated week (see sim/weekEngine.ts).
   *
   * The outcome is computed once by the Week Resolution screen and handed here verbatim, so what
   * the player watched is exactly what is applied. Guards make the call idempotent: a stale
   * outcome (wrong week / wrong rng position) or an empty plan is ignored, so reloading or
   * re-entering the screen can never pay a reward twice.
   */
  commitWeek(outcome: WeekOutcome) {
    update((d) => {
      if (d.world.week !== outcome.week || d.world.year !== outcome.year) return;
      if (d.rng.streams.world !== outcome.rngPosition) return;
      if (!d.weeklyPlan.mainActions.some(Boolean)) return;

      const week = d.world.week;

      d.economy.cash -= outcome.expense;
      d.economy.ledger.push({ week, label: `${week}주차 운영비`, amount: -outcome.expense });
      if (outcome.musicIncome > 0) {
        d.economy.cash += outcome.musicIncome;
        d.economy.ledger.push({ week, label: '음원 수익', amount: outcome.musicIncome });
      }

      outcome.members.forEach((m) => {
        const st = d.characterStates[m.characterId];
        if (!st) return;
        st.condition.energy = clampCondition(st.condition.energy + m.energy);
        st.condition.stress = clampCondition(st.condition.stress + m.stress);
        st.condition.morale = clampCondition(st.condition.morale + m.morale);
        st.growth.experience += m.experience;
        st.growth.developmentStage = stageForExperience(st.growth.experience);
        st.personalPopularity += m.personalPopularity;
        const base = CHARACTERS[m.characterId].visibleStats;
        (Object.keys(m.statGains) as (keyof typeof base)[]).forEach((k) => {
          const add = m.statGains[k];
          if (!add) return;
          const current = st.currentStats[k] ?? base[k];
          st.currentStats[k] = Math.min(100, current + add);
        });
        if (st.growth.developmentStage >= 3 && st.careerStage === 'ROOKIE') st.careerStage = 'GROWTH';
      });

      if (outcome.newSong) {
        d.counters.song += 1;
        const id = `song_${pad(d.counters.song)}`;
        const { composerId, ...song } = outcome.newSong;
        void composerId;
        d.songs[id] = { id, ...song };
      }

      // v1 규칙 3: the recording slot finishes one demo. Guarded so a song is never recorded twice.
      if (outcome.recording) {
        const song = d.songs[outcome.recording.songId];
        if (song && !isRecorded(song) && !isReleased(song.status)) {
          song.recordedWeek = week + (d.world.year - 1) * 52;
        }
      }
      // v1 규칙 2: rehearsal time is banked on the song it was spent on.
      if (outcome.rehearsal) {
        const song = d.songs[outcome.rehearsal.songId];
        if (song) song.rehearsalCount = (song.rehearsalCount ?? 0) + outcome.rehearsal.slots;
      }

      if (outcome.fansDelta) d.band.metrics.fans += outcome.fansDelta;
      if (outcome.fanLoyaltyDelta) d.band.metrics.fanLoyalty += outcome.fanLoyaltyDelta;

      outcome.newOffers.forEach((offer) => {
        d.counters.opportunity += 1;
        const id = `opp_${pad(d.counters.opportunity)}`;
        d.opportunities[id] = { id, ...offer };
      });

      Object.values(d.opportunities).forEach((o) => {
        if ((o.status === 'NEW' || o.status === 'SEEN' || o.status === 'LATER') && week > o.expiresWeek) {
          o.status = 'EXPIRED';
        }
      });

      Object.values(d.sessionHires).forEach((h) => {
        if (week < h.endWeek) return;
        d.band.lineup.forEach((slot) => {
          if (slot.assignment?.kind === 'SESSION' && slot.assignment.instanceId === h.instanceId) {
            slot.assignment = null;
          }
        });
        delete d.sessionHires[h.instanceId];
        d.careerHistory.push({ week, type: 'LINEUP_CHANGE', text: '세션 계약이 끝났다' });
      });

      d.world.week += 1;
      if (d.world.week > 52) { d.world.week = 1; d.world.year += 1; }
      settleContracts(d);
      // 명세 §2·§3: 예약과 합주 대상은 주가 바뀌어도 남는다.
      //  - 새 곡 작업: 데모가 나왔을 때만 소모되고, 합주가 없던 주에는 그대로 유지된다.
      //  - 합주 대상: 플레이어가 고른 곡은 매주 다시 지정할 필요가 없다.
      //  - 녹음 대상: 녹음이 끝나면 비우고, 아직 녹음할 수 있는 곡이면 남겨 둔다.
      const carried = d.weeklyPlan.songWork;
      const recordingStillOpen = carried.recordingSongId
        && !outcome.recording
        && d.songs[carried.recordingSongId]
        && !isRecorded(d.songs[carried.recordingSongId])
        && !isReleased(d.songs[carried.recordingSongId].status);
      d.weeklyPlan = {
        mainActions: [null, null, null],
        individualActions: [],
        songWork: {
          newSong: carried.newSong && !outcome.newSong,
          rehearsalSongId: carried.rehearsalSongId && d.songs[carried.rehearsalSongId] ? carried.rehearsalSongId : null,
          recordingSongId: recordingStillOpen ? carried.recordingSongId : null,
        },
      };
      d.rng.streams.world += 1;

      syncCareer(d);
    });
  },
};

/** Re-derive milestones and career tier, logging each advancement once (Character Master §14). */
function syncCareer(d: SaveData): MilestoneId[] {
  const reached = achievedMilestones(d);
  const logged = new Set(d.careerHistory.filter((h) => h.type === 'MILESTONE').map((h) => h.text));
  const fresh: MilestoneId[] = [];
  reached.forEach((m) => {
    const label = MILESTONES[m].label;
    if (logged.has(label)) return;
    fresh.push(m);
    d.careerHistory.push({ week: d.world.week, type: 'MILESTONE', text: label });
  });

  const tier = careerTierFor(d);
  if (tier !== d.band.careerTier) {
    d.band.careerTier = tier as CareerTier;
    d.world.careerTier = tier as CareerTier;
    d.careerHistory.push({
      week: d.world.week, type: 'MILESTONE',
      text: `${CAREER_TIERS[tier].label} 단계에 올랐다`,
    });
  }
  return fresh;
}

// ---------------------------------------------------------------- Songs & releases
const R = PROTOTYPE_BALANCE.release;

export const songActions = {
  /** Keep Demo / Save for EP are bookkeeping; releasing is a separate action with real effects. */
  setStatus(songId: string, status: SaveData['songs'][string]['status']) {
    update((d) => {
      const s = d.songs[songId];
      if (!s || isReleased(s.status)) return;
      s.status = status;
    });
  },

  /**
   * Release songs (GDD §06 발매 전략). A single and an EP write different records and apply
   * different results; the payout is snapshotted on the release (Character Master §14).
   */
  release(kind: ReleaseKind, songIds: string[]) {
    update((d) => {
      const format = RELEASE_FORMATS[kind];
      const songs = songIds.map((id) => d.songs[id]).filter(Boolean);
      if (!format || songs.length < format.songsRequired) return;
      if (songs.some((s) => isReleased(s.status))) return;
      // v1 규칙 4: only recorded songs can be released.
      if (songs.some((s) => !isRecorded(s))) return;

      const week = d.world.week;
      const absWeek = week + (d.world.year - 1) * 52;
      const popularity = songs.reduce((a, s) => a + s.musicProfile.popularity, 0);
      const artistry = songs.reduce((a, s) => a + s.musicProfile.artistry, 0) / songs.length;
      const fanFit = songs.reduce((a, s) => a + s.musicProfile.fanFit, 0) / songs.length;
      const multiplier = kind === 'EP' ? R.epMultiplier : 1;

      const revenue = Math.round(popularity * R.revenuePerPopularity * multiplier / 100) * 100;
      const fansDelta = Math.round(popularity * R.fansPerPopularity * multiplier / songs.length);
      const reputationDelta = Math.round(artistry * R.reputationPerArtistry);
      const musicalDelta = Math.round(artistry * R.musicalReputationPerArtistry);
      const loyaltyDelta = Math.round(fanFit * R.fanLoyaltyPerFanFit);

      d.counters.release += 1;
      const id = `rel_${pad(d.counters.release)}`;
      d.releases[id] = {
        id, type: kind, songIds: songs.map((s) => s.id), releasedWeek: absWeek,
        result: { revenue, fansDelta, reputationDelta, popularity },
      };
      songs.forEach((s) => { s.status = RELEASED_STATUS_BY_FORMAT[kind]; });

      d.economy.cash += revenue;
      d.economy.ledger.push({ week, label: `${format.label} 발매 수익`, amount: revenue });
      d.band.metrics.fans += fansDelta;
      d.band.metrics.reputation += reputationDelta;
      d.band.metrics.musicalReputation += musicalDelta;
      d.band.metrics.fanLoyalty += loyaltyDelta;
      d.careerHistory.push({
        week, type: 'RELEASE',
        text: `${format.label} 발매 · ${songs.map((s) => s.title).join(', ')}`,
      });
      syncCareer(d);
    });
  },
};

// ---------------------------------------------------------------- Opportunity Inbox
export const opportunityActions = {
  markSeen(id: string) {
    update((d) => { const o = d.opportunities[id]; if (o && o.status === 'NEW') o.status = 'SEEN'; });
  },
  accept(id: string) {
    update((d) => {
      const o = d.opportunities[id];
      if (!o) return;
      o.status = 'ACCEPTED';
      if (o.type === 'LIVE' && o.payload?.venueId) {
        d.pendingPerformance = { opportunityId: id, venueId: o.payload.venueId, openingSongId: null, status: 'SCHEDULED' };
      }
    });
  },
  decline(id: string) { update((d) => { const o = d.opportunities[id]; if (o) o.status = 'DECLINED'; }); },
  later(id: string) { update((d) => { const o = d.opportunities[id]; if (o) o.status = 'LATER'; }); },
};

// ---------------------------------------------------------------- Contract (V1)
export const contractActions = {
  /**
   * 재계약 (CONTRACT V1 §3). 기존 계약은 끝까지 기존 조건으로 유지되고,
   * 새 계약은 기존 계약이 끝난 다음 주부터 시작한다.
   */
  renew(characterId: CharacterId, terms: { salary: number; durationWeeks: number; rolePromise: 'CORE_MEMBER' | 'SUPPORT_MEMBER' }) {
    update((d) => {
      const c = d.contracts[characterId];
      if (!c) return;
      if (!renewalOpen(c, d.world)) return;               // 마지막 구간에서만 열린다
      if (!acceptsTerms(characterId, terms)) return;       // 판정을 통과한 조건만 저장한다
      c.renewal = { ...terms };
      d.careerHistory.push({
        week: d.world.week, type: 'CONTRACT',
        text: `${CHARACTERS[characterId].name} 재계약 합의 (${c.endWeek + 1}주차부터)`,
      });
    });
  },
  cancelRenewal(characterId: CharacterId) {
    update((d) => { const c = d.contracts[characterId]; if (c) c.renewal = null; });
  },
  /**
   * 계약 중 역할 변경 (CONTRACT V1 §5). 새 조건으로 다시 합의해야 하고, 다음 주부터 적용된다.
   * 계약 만료일은 그대로 유지한다.
   */
  changeRole(characterId: CharacterId, terms: { salary: number; rolePromise: 'CORE_MEMBER' | 'SUPPORT_MEMBER' }) {
    update((d) => {
      const c = d.contracts[characterId];
      if (!c) return;
      const remaining = c.endWeek - absoluteWeek(d.world) + 1;
      // 남은 기간을 그대로 두고 같은 판정을 다시 통과해야 한다.
      if (!acceptsTerms(characterId, { ...terms, durationWeeks: nearestDurationOption(remaining) })) return;
      c.pendingChange = { salary: terms.salary, rolePromise: terms.rolePromise, effectiveWeek: absoluteWeek(d.world) + 1 };
    });
  },
  /** 약속을 지킬 수 있는 편성이 없어 공연을 허용한 경우의 기록 (CONTRACT V1 §4-B). */
  recordStarterException(characterId: CharacterId, text: string) {
    update((d) => {
      d.contractExceptions.push({ week: d.world.week, characterId, kind: 'STARTER_PROMISE_UNMEETABLE', text });
    });
  },
};

// ---------------------------------------------------------------- Performance
export const performanceActions = {
  setOpeningSong(songId: string) {
    update((d) => { if (d.pendingPerformance) d.pendingPerformance.openingSongId = songId; });
  },
  /**
   * Store the finished show as a historical snapshot (values at that time) and apply EVERYTHING
   * the show costs and pays: production cost, member fatigue and experience, money, fans and
   * reputation. This is the only place a show is settled, so the weekly engine leaves the
   * LIVE_SHOW slot alone and nothing can be applied twice.
   */
  commit(snapshot: Omit<PerformanceSnapshot, 'id' | 'week'>) {
    update((d) => {
      // A show must be booked to be settled; after this the booking is cleared, so a repeated
      // call (re-entering the stage, a reload) finds nothing to settle.
      if (!d.pendingPerformance || d.pendingPerformance.status === 'DONE') return;

      d.counters.performance += 1;
      const snap: PerformanceSnapshot = { ...snapshot, id: `perf_${pad(d.counters.performance)}`, week: d.world.week };
      d.performanceHistory.push(snap);
      d.band.metrics.fans += snap.fansDelta;
      d.band.metrics.reputation += snap.reputationDelta;
      d.economy.cash += snap.revenue;
      d.economy.ledger.push({ week: d.world.week, label: `${snap.venueName} 공연 수익`, amount: snap.revenue });
      if (d.performanceHistory.length === 1) {
        d.careerHistory.push({ week: d.world.week, type: 'MILESTONE', text: `첫 공연 · ${snap.venueName} · 관객 ${snap.audience}명 · ${snap.grade}` });
      }
      if (d.pendingPerformance) {
        const acceptedId = d.pendingPerformance.opportunityId;
        const offer = d.opportunities[acceptedId];
        if (offer) offer.status = 'ACCEPTED';
        d.pendingPerformance.status = 'DONE';
      }
      d.pendingPerformance = null;

      // GDD §05 핵심지출 "공연 제작비": the night is paid for when it is actually played.
      const productionCost = ACTIVITIES.find((a) => a.scope === 'BAND' && a.id === 'LIVE_SHOW')?.cost ?? 0;
      if (productionCost > 0) {
        d.economy.cash -= productionCost;
        d.economy.ledger.push({ week: d.world.week, label: `${snap.venueName} 공연 제작비`, amount: -productionCost });
      }

      // GDD §06 공연 보상에 "멤버 경험"이 포함된다. 무대에 선 사람만 소모하고 배운다.
      // 수치는 기존 LIVE_SHOW 활동값 그대로다 (밸런스 변경 없음).
      const fx = B.activityEffects.LIVE_SHOW;
      const onStage = d.band.lineup
        .map((s) => (s.assignment?.kind === 'MEMBER' ? s.assignment.characterId : null))
        .filter((id): id is CharacterId => !!id);
      const performers = onStage.length > 0 ? onStage : d.band.activeMembers;
      performers.forEach((id) => {
        const st = d.characterStates[id];
        if (!st) return;
        const conditionOnStage = { ...st.condition };
        st.condition.energy = clampCondition(st.condition.energy + fx.energy * energyFactorOf(id));
        st.condition.stress = clampCondition(st.condition.stress + fx.stress);
        st.condition.morale = clampCondition(st.condition.morale + fx.morale);
        grantExperience(st, id, fx.experience, conditionOnStage);
        if (st.growth.developmentStage >= 3 && st.careerStage === 'ROOKIE') st.careerStage = 'GROWTH';
      });

      // Follow-up opportunity (IA §6 example: Local Radio 인터뷰 / Expires this week)
      d.counters.opportunity += 1;
      const id = `opp_${pad(d.counters.opportunity)}`;
      d.opportunities[id] = {
        id, type: 'MEDIA', title: 'Local Radio 인터뷰', description: '공연을 본 지역 라디오가 인터뷰를 제안했다.',
        createdWeek: d.world.week, expiresWeek: d.world.week + B.opportunity.mediaOfferWindowWeeks, status: 'NEW',
      };
      d.rng.streams.performance += 1;

      // A sold-out night or a new fan count can move the career forward straight away.
      syncCareer(d);
    });
  },
};

// ---------------------------------------------------------------- Facilities
export const facilityActions = {
  build(facilityId: string, cost: number) {
    update((d) => {
      const f = d.facilities[facilityId];
      if (!f || f.built) return;
      f.built = true;
      f.level = 1;
      d.economy.cash -= cost;
      d.economy.ledger.push({ week: d.world.week, label: `${FACILITIES[facilityId]?.name ?? facilityId} 건설`, amount: -cost });
      d.careerHistory.push({ week: d.world.week, type: 'FACILITY', text: `${FACILITIES[facilityId]?.name ?? facilityId} 건설 완료` });
      // "기본 시설 확장" is one of the Local Act requirements (GDD §07).
      syncCareer(d);
      // "기본 시설 확장" is one of the Local Act requirements (GDD §07).
      syncCareer(d);
    });
  },
};
