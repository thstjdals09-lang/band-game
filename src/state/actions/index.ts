// Domain actions - the only place that mutates SaveData. UI calls these; simulation depth is PHASE 2+.
// All numeric tuning lives in PROTOTYPE_BALANCE (TODO(balance)).
import {
  CHARACTERS, CONTRACT_PROFILES, PROTOTYPE_BALANCE, SESSION_TEMPLATES, VENUES,
  type CharacterId, type IndividualActionId, type MainActionId, type SlotId,
} from '@/data/master';
import { useGameStore } from '../store';
import { firstEmptyCompatibleSlotIndex, projectedExpense, songCount } from '../selectors';
import type { LineupAssignment, PerformanceSnapshot, RevealKey, SaveData } from '../save/schema';

const B = PROTOTYPE_BALANCE;
const update = (fn: (d: SaveData) => void) => useGameStore.getState().update(fn);
const pad = (n: number) => String(n).padStart(5, '0');

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
      d.contracts[id] = {
        characterId: id, salary: terms.salary, startWeek: week, endWeek: week + terms.durationWeeks,
        rolePromise: terms.rolePromise, clauses: profile?.clauses ?? [], satisfaction: B.contract.initialSatisfaction,
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
    update((d) => { d.weeklyPlan.mainActions[index] = actionId; });
  },
  setIndividualAction(index: number, plan: { characterId: CharacterId; actionId: IndividualActionId } | null) {
    update((d) => {
      const list = d.weeklyPlan.individualActions;
      if (plan) list[index] = plan; else list.splice(index, 1);
      d.weeklyPlan.individualActions = list.slice(0, 2);
    });
  },
  /**
   * Commit the week (called at the end of the Week Resolution flow).
   * TODO(PHASE2 engine): growth / relationships / condition / event selection / RNG streams.
   * Prototype script: pay expenses, advance week, create a demo per creative week until the Debut
   * Showcase song requirement (minSongsForDebut) is met, then spawn the first live opportunity.
   */
  commitWeek(input: { newSongTitle?: string }) {
    update((d) => {
      const week = d.world.week;
      const expense = projectedExpense(d);
      d.economy.cash -= expense;
      d.economy.ledger.push({ week, label: `Week ${week} expenses`, amount: -expense });

      const didCreate = d.weeklyPlan.mainActions.some((a) => a === 'PRACTICE' || a === 'RECORDING');
      if (didCreate && input.newSongTitle) {
        d.counters.song += 1;
        const id = `song_${pad(d.counters.song)}`;
        const members = d.band.activeMembers;
        const composer = [...members].sort((a, b) => CHARACTERS[b].hiddenStats.composing - CHARACTERS[a].hiddenStats.composing)[0];
        const lyricist = [...members].sort((a, b) => CHARACTERS[b].hiddenStats.lyrics - CHARACTERS[a].hiddenStats.lyrics)[0];
        const avg = (k: 'star' | 'creative' | 'stage') => Math.round(members.reduce((s, m) => s + CHARACTERS[m].visibleStats[k], 0) / Math.max(1, members.length));
        d.songs[id] = {
          id, title: input.newSongTitle, createdWeek: week,
          contributors: { composer: composer ? [composer] : [], lyrics: lyricist ? [lyricist] : [] },
          originContext: d.weeklyPlan.mainActions.includes('RECORDING') ? ['RECORDING_SESSION'] : ['BAND_PRACTICE'],
          // TODO(PHASE2 engine): 4-axis evaluation from member ability + traits + Music DNA + relationships + events.
          musicProfile: { popularity: avg('star'), artistry: avg('creative'), fanFit: B.songs.demoFanFit, liveFit: avg('stage') },
          genreTags: Array.from(new Set(members.flatMap((m) => CHARACTERS[m].musicTags))).slice(0, 2),
          status: 'UNRELEASED',
        };
      }

      // First live opportunity (IA §6 example: Basement Club 공연 제안) - only once the Debut song requirement is met.
      const hasLiveOffer = Object.values(d.opportunities).some((o) => o.type === 'LIVE');
      if (!hasLiveOffer && d.band.activeMembers.length >= 1 && songCount(d) >= B.songs.minSongsForDebut) {
        d.counters.opportunity += 1;
        const id = `opp_${pad(d.counters.opportunity)}`;
        const createdWeek = week + B.opportunity.liveOfferDelayWeeks;
        d.opportunities[id] = {
          id, type: 'LIVE', title: 'Basement Club 공연 제안',
          description: `${VENUES.BASEMENT_CLUB.name}에서 Debut Showcase를 제안했다.`,
          createdWeek, expiresWeek: createdWeek + B.opportunity.liveOfferWindowWeeks, status: 'NEW', payload: { venueId: 'BASEMENT_CLUB' },
        };
      }

      // condition drift placeholder
      d.band.activeMembers.forEach((id) => {
        const c = d.characterStates[id]?.condition;
        if (!c) return;
        const rested = d.weeklyPlan.mainActions.includes('REST');
        c.energy = Math.max(0, Math.min(100, c.energy + (rested ? B.week.energyRest : B.week.energyDrift)));
      });

      d.world.week += 1;
      if (d.world.week > 52) { d.world.week = 1; d.world.year += 1; }
      d.weeklyPlan = { mainActions: [null, null, null], individualActions: [] };
      d.rng.streams.world += 1;
    });
  },
};

// ---------------------------------------------------------------- Songs
export const songActions = {
  setStatus(songId: string, status: SaveData['songs'][string]['status']) {
    update((d) => { const s = d.songs[songId]; if (s) s.status = status; });
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

// ---------------------------------------------------------------- Performance
export const performanceActions = {
  setOpeningSong(songId: string) {
    update((d) => { if (d.pendingPerformance) d.pendingPerformance.openingSongId = songId; });
  },
  /** Store the finished show as a historical snapshot (values at that time) and apply rewards. */
  commit(snapshot: Omit<PerformanceSnapshot, 'id' | 'week'>) {
    update((d) => {
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
      if (d.pendingPerformance) d.pendingPerformance.status = 'DONE';
      d.pendingPerformance = null;
      // Follow-up opportunity (IA §6 example: Local Radio 인터뷰 / Expires this week)
      d.counters.opportunity += 1;
      const id = `opp_${pad(d.counters.opportunity)}`;
      d.opportunities[id] = {
        id, type: 'MEDIA', title: 'Local Radio 인터뷰', description: '공연을 본 지역 라디오가 인터뷰를 제안했다.',
        createdWeek: d.world.week, expiresWeek: d.world.week + B.opportunity.mediaOfferWindowWeeks, status: 'NEW',
      };
      d.rng.streams.performance += 1;
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
      d.economy.ledger.push({ week: d.world.week, label: `${facilityId} 건설`, amount: -cost });
      d.careerHistory.push({ week: d.world.week, type: 'FACILITY', text: `${facilityId} 건설 완료` });
    });
  },
};
