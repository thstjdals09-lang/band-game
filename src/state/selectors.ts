// Derived values (Character Master §14: current derived values are recomputed, never stored).
// UI must not compute formulas itself - it reads selectors (Implementation Guardrails: "UI에서 계산식을 직접 작성하지 않는다").
import {
  ACTIVITIES, CHARACTERS, CONTRACT_PROFILES, FACILITIES, PROTOTYPE_BALANCE, RELEASE_FORMATS,
  SESSION_TEMPLATES, SLOT_DEFINITIONS, VENUES,
  type CharacterId, type SlotId, type VisibleStats,
} from '@/data/master';
import type { LineupAssignment, SaveData } from './save/schema';
import { unlockedRevenueStreams } from './sim/career';

export type Grade = 'GREAT' | 'GOOD' | 'FAIR' | 'POOR' | '—';
export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

export function ownedMembers(save: SaveData): CharacterId[] {
  return save.band.activeMembers;
}

export function currentVisibleStats(save: SaveData, id: CharacterId): VisibleStats {
  return { ...CHARACTERS[id].visibleStats, ...(save.characterStates[id]?.currentStats ?? {}) };
}

// ---- Lineup (variable slot list) ----------------------------------------------------------
export interface LineupSlotView {
  index: number;      // position in band.lineup (slotIds may repeat in the future)
  slot: SlotId;
  label: string;
  core: boolean;
  assignment: LineupAssignment | null;
  displayName: string | null;
  kind: 'EMPTY' | 'MEMBER' | 'SESSION';
  characterId?: CharacterId;
}

export function lineupView(save: SaveData): LineupSlotView[] {
  return save.band.lineup.map((s, index) => {
    const def = SLOT_DEFINITIONS[s.slotId];
    const base = { index, slot: s.slotId, label: def?.label ?? s.slotId, core: def?.core ?? false };
    const a = s.assignment;
    if (!a) return { ...base, assignment: null, displayName: null, kind: 'EMPTY' };
    if (a.kind === 'MEMBER') {
      return { ...base, assignment: a, displayName: CHARACTERS[a.characterId].name, kind: 'MEMBER', characterId: a.characterId };
    }
    const hire = save.sessionHires[a.instanceId];
    const tpl = SESSION_TEMPLATES.find((t) => t.templateId === hire?.templateId);
    return { ...base, assignment: a, displayName: tpl?.label ?? 'SESSION', kind: 'SESSION' };
  });
}

export function lineupCapacity(save: SaveData): number {
  return save.band.lineup.length;
}

export function assignedCharacterIds(save: SaveData): CharacterId[] {
  return save.band.lineup
    .map((s) => s.assignment)
    .filter((a): a is { kind: 'MEMBER'; characterId: CharacterId } => !!a && a.kind === 'MEMBER')
    .map((a) => a.characterId);
}

export function isCompatible(id: CharacterId, slot: SlotId): boolean {
  const def = SLOT_DEFINITIONS[slot];
  return !!def && CHARACTERS[id].positions.some((p) => def.compatiblePositions.includes(p));
}

/** Members compatible with a slot and not already assigned in any slot. */
export function membersAvailableForSlot(save: SaveData, slot: SlotId): CharacterId[] {
  const assigned = assignedCharacterIds(save);
  return save.band.activeMembers.filter((id) => !assigned.includes(id) && isCompatible(id, slot));
}

/** Indices of active lineup slots this character can play (other than `exceptIndex`). */
export function slotIndicesForCharacter(save: SaveData, id: CharacterId, exceptIndex?: number): number[] {
  return save.band.lineup
    .map((s, i) => (i !== exceptIndex && isCompatible(id, s.slotId) ? i : -1))
    .filter((i) => i >= 0);
}

export function firstEmptyCompatibleSlotIndex(save: SaveData, id: CharacterId): number {
  return save.band.lineup.findIndex((s) => !s.assignment && isCompatible(id, s.slotId));
}

// ---- Chemistry diagnostics (IA §10) -------------------------------------------------------
// The six axes need the relationship engine (Character Master §06), which is PHASE 2B.
// Until then they report honestly as unknown rather than printing invented grades.
export interface ChemistryDiagnostics {
  musicalFit: Grade; creativeBalance: Grade; liveStability: Grade; starPower: Grade; teamwork: Grade; conflictRisk: RiskGrade;
  /** Why the axes are blank; shown to the player instead of a fake value. */
  reason: string;
}
export function chemistryDiagnostics(save: SaveData): ChemistryDiagnostics {
  const n = lineupView(save).filter((s) => s.kind !== 'EMPTY').length;
  return {
    musicalFit: '—', creativeBalance: '—', liveStability: '—', starPower: '—', teamwork: '—', conflictRisk: '—',
    reason: n === 0 ? '라인업이 비어 있다' : '관계가 쌓여야 드러난다',
  };
}

// ---- Economy -----------------------------------------------------------------------------
export function weeklySalaryBurden(save: SaveData): number {
  return Object.values(save.contracts).reduce((sum, c) => sum + (c?.salary ?? 0), 0);
}
export function weeklySessionCost(save: SaveData): number {
  return Object.values(save.sessionHires).reduce((sum, h) => sum + h.weeklyCost, 0);
}
export function projectedExpense(save: SaveData): number {
  const actionCost = save.weeklyPlan.mainActions.reduce((sum, a) => {
    const def = a ? ACTIVITIES.find((x) => x.scope === 'BAND' && x.id === a) : undefined;
    return sum + (def?.cost ?? 0);
  }, 0);
  const indCost = save.weeklyPlan.individualActions.reduce((sum, ia) => {
    const def = ACTIVITIES.find((x) => x.scope === 'INDIVIDUAL' && x.id === ia.actionId);
    return sum + (def?.cost ?? 0);
  }, 0);
  return weeklySalaryBurden(save) + weeklySessionCost(save) + actionCost + indCost;
}

export interface ScheduleWarning { level: 'WARN' | 'RISK'; text: string }
export function scheduleWarnings(save: SaveData): ScheduleWarning[] {
  const out: ScheduleWarning[] = [];
  save.band.activeMembers.forEach((id) => {
    const c = save.characterStates[id]?.condition;
    if (c && c.energy < 40) out.push({ level: 'WARN', text: `${CHARACTERS[id].name} 체력이 떨어져 있다` });
    if (c && c.stress > 60) out.push({ level: 'RISK', text: `${CHARACTERS[id].name} 스트레스가 높다` });
  });
  if (projectedExpense(save) > save.economy.cash) out.push({ level: 'RISK', text: '예상 지출이 보유 자금을 넘는다' });
  return out;
}

// ---- Facilities / Basecamp ---------------------------------------------------------------
// Unlock gates now live in the facility master data (FacilityDefinition.unlock) and are evaluated
// by sim/career.ts against milestones and career tier.
export type { FacilityAvailability } from './sim/career';
export { facilityAvailabilityFor as facilityAvailability, activityUnlocked } from './sim/career';
export { achievedMilestones, careerProgress, careerTierFor, unlockedRevenueStreams } from './sim/career';

export function basecampStage(save: SaveData): number {
  return Object.values(save.facilities).reduce((stage, f) => {
    const def = FACILITIES[f.facilityId];
    return f.built && def?.basecampStageAfterBuild ? Math.max(stage, def.basecampStageAfterBuild) : stage;
  }, 1);
}

// ---- Songs / Opportunities / Performance ---------------------------------------------------
export function songList(save: SaveData) {
  return Object.values(save.songs).sort((a, b) => a.createdWeek - b.createdWeek);
}
export function songCount(save: SaveData): number {
  return Object.keys(save.songs).length;
}
/** Debut Showcase readiness rule: at least minSongsForDebut songs (IA §17 - 첫 공연 전 최소 2곡). */
export function debutSongRequirement(save: SaveData): { required: number; have: number; met: boolean } {
  const required = PROTOTYPE_BALANCE.songs.minSongsForDebut;
  const have = songCount(save);
  return { required, have, met: have >= required };
}
export function unreadOpportunityCount(save: SaveData): number {
  return Object.values(save.opportunities).filter((o) => o.status === 'NEW').length;
}
export function pendingOpportunities(save: SaveData) {
  return Object.values(save.opportunities)
    .filter((o) => o.status === 'NEW' || o.status === 'SEEN' || o.status === 'LATER')
    .sort((a, b) => a.expiresWeek - b.expiresWeek);
}
export function pendingVenueName(save: SaveData): string | null {
  const p = save.pendingPerformance;
  return p ? VENUES[p.venueId]?.name ?? p.venueId : null;
}

// ---- Releases (GDD §06 발매 전략 / §05 수익 해금 단계) ------------------------------------
export interface ReleaseReadiness {
  /** Music revenue opens only after the first show (GDD: 공연 -> 음원/앨범). */
  canRelease: boolean;
  epSongs: ReturnType<typeof songList>;
  canReleaseEp: boolean;
}

export function releaseReadiness(save: SaveData): ReleaseReadiness {
  const canRelease = unlockedRevenueStreams(save).includes('MUSIC');
  const epSongs = songList(save).filter((s) => s.status === 'SAVED_FOR_EP');
  return {
    canRelease,
    epSongs,
    canReleaseEp: canRelease && epSongs.length >= RELEASE_FORMATS.EP.songsRequired,
  };
}

export function conditionWord(v: number): string {
  if (v >= 75) return '좋음';
  if (v >= 50) return '보통';
  if (v >= 30) return '낮음';
  return '위험';
}

// ---- Candidate fit facts (COMPARE / Candidate Detail) ------------------------------------
// Only FACTS derived from existing master + save data. Diagnostics that need the (not yet built)
// simulation engine are returned as 'unknown' with the reason - never as an invented number.
export interface CandidateFitUnknown { label: string; reason: string }
export interface CandidateFit {
  contractBurden: string;
  sharedTags: string[];
  fillsSlotLabel: string | null;
  unknown: CandidateFitUnknown[];
}

export function candidateFit(save: SaveData, id: CharacterId): CandidateFit {
  const def = CHARACTERS[id];
  const bandTags = new Set(save.band.activeMembers.flatMap((m) => CHARACTERS[m].musicTags));
  const sharedTags = def.musicTags.filter((t) => bandTags.has(t));
  const emptySlot = save.band.lineup.find((s) => !s.assignment && isCompatible(id, s.slotId));
  const audition = Object.values(save.auditions).find((a) => a.status === 'OPEN' && a.candidateIds.includes(id));
  const jammed = !!audition?.revealedInformation[id]?.includes('JAM_SESSION');
  const noBand = save.band.activeMembers.length === 0;
  const reason = noBand ? '라인업 멤버가 아직 없다' : jammed ? '함께 활동해야 드러난다' : '합주해 보면 알 수 있다';
  return {
    contractBurden: CONTRACT_PROFILES[def.contractProfileId]?.burden ?? '?',
    sharedTags,
    fillsSlotLabel: emptySlot ? SLOT_DEFINITIONS[emptySlot.slotId].label : null,
    unknown: [
      { label: '음악적 궁합', reason },
      { label: '창작 균형', reason },
      { label: '라이브 기여', reason },
      { label: '갈등 위험', reason },
    ],
  };
}
