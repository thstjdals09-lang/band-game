// Derived values (Character Master §14: current derived values are recomputed, never stored).
// UI must not compute formulas itself - it reads selectors (Implementation Guardrails: "UI에서 계산식을 직접 작성하지 않는다").
import {
  ACTIVITIES, CHARACTERS, FACILITIES, LINEUP_SLOTS, SESSION_TEMPLATES, VENUES,
  type CharacterId, type SlotId, type VisibleStats,
} from '@/data/master';
import type { LineupAssignment, SaveData } from './save/schema';

export type Grade = 'GREAT' | 'GOOD' | 'FAIR' | 'POOR' | '—';
export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | '—';

export function ownedMembers(save: SaveData): CharacterId[] {
  return save.band.activeMembers;
}

export function currentVisibleStats(save: SaveData, id: CharacterId): VisibleStats {
  return { ...CHARACTERS[id].visibleStats, ...(save.characterStates[id]?.currentStats ?? {}) };
}

export interface LineupSlotView {
  slot: SlotId;
  label: string;
  assignment: LineupAssignment | null;
  displayName: string | null;
  kind: 'EMPTY' | 'MEMBER' | 'SESSION';
  characterId?: CharacterId;
}

export function lineupView(save: SaveData): LineupSlotView[] {
  return LINEUP_SLOTS.map((s) => {
    const a = save.band.lineup[s.id];
    if (!a) return { slot: s.id, label: s.label, assignment: null, displayName: null, kind: 'EMPTY' };
    if (a.kind === 'MEMBER') {
      return { slot: s.id, label: s.label, assignment: a, displayName: CHARACTERS[a.characterId].name, kind: 'MEMBER', characterId: a.characterId };
    }
    const hire = save.sessionHires[a.instanceId];
    const tpl = SESSION_TEMPLATES.find((t) => t.templateId === hire?.templateId);
    return { slot: s.id, label: s.label, assignment: a, displayName: tpl?.label ?? 'SESSION', kind: 'SESSION' };
  });
}

export function assignedCharacterIds(save: SaveData): CharacterId[] {
  return Object.values(save.band.lineup)
    .filter((a): a is { kind: 'MEMBER'; characterId: CharacterId } => !!a && a.kind === 'MEMBER')
    .map((a) => a.characterId);
}

/** Members compatible with a slot and not already assigned elsewhere. */
export function membersAvailableForSlot(save: SaveData, slot: SlotId): CharacterId[] {
  const slotDef = LINEUP_SLOTS.find((s) => s.id === slot)!;
  const assigned = assignedCharacterIds(save);
  return save.band.activeMembers.filter((id) => {
    if (assigned.includes(id) && save.band.lineup[slot]?.kind === 'MEMBER' && (save.band.lineup[slot] as { characterId: CharacterId }).characterId === id) return false;
    if (assigned.includes(id)) return false;
    return CHARACTERS[id].positions.some((p) => slotDef.compatiblePositions.includes(p));
  });
}

export function slotsForCharacter(id: CharacterId): SlotId[] {
  return LINEUP_SLOTS.filter((s) => CHARACTERS[id].positions.some((p) => s.compatiblePositions.includes(p))).map((s) => s.id);
}

export function firstEmptyCompatibleSlot(save: SaveData, id: CharacterId): SlotId | null {
  return slotsForCharacter(id).find((s) => !save.band.lineup[s]) ?? null;
}

// ---- Chemistry diagnostics (IA §10) -------------------------------------------------------
// TODO(PHASE2 engine): real calculation = Music DNA mean + variance + extremes + role influence (Character Master §05)
// + personality + relationships. Prototype returns placeholder grades so the screen structure can be validated.
export interface ChemistryDiagnostics {
  musicalFit: Grade; creativeBalance: Grade; liveStability: Grade; starPower: Grade; teamwork: Grade; conflictRisk: RiskGrade;
}
export function chemistryDiagnostics(save: SaveData): ChemistryDiagnostics {
  const n = lineupView(save).filter((s) => s.kind !== 'EMPTY').length;
  if (n === 0) return { musicalFit: '—', creativeBalance: '—', liveStability: '—', starPower: '—', teamwork: '—', conflictRisk: '—' };
  return { musicalFit: 'GOOD', creativeBalance: 'GREAT', liveStability: 'FAIR', starPower: 'GREAT', teamwork: 'GOOD', conflictRisk: 'MEDIUM' };
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
    if (c && c.energy < 40) out.push({ level: 'WARN', text: `${CHARACTERS[id].name} energy is low.` });
    if (c && c.stress > 60) out.push({ level: 'RISK', text: `${CHARACTERS[id].name} stress is high.` });
  });
  if (projectedExpense(save) > save.economy.cash) out.push({ level: 'RISK', text: 'Projected expense exceeds cash.' });
  return out;
}

// ---- Facilities / Basecamp ---------------------------------------------------------------
export type FacilityAvailability = 'BUILT' | 'AVAILABLE' | 'LOCKED';
export function facilityAvailability(save: SaveData, facilityId: string): FacilityAvailability {
  const st = save.facilities[facilityId];
  if (st?.built) return 'BUILT';
  // TODO(PHASE2 engine): unlock conditions are data (careerTiers/milestones master). Prototype rule:
  if (facilityId === 'RECORDING_ROOM') return save.performanceHistory.length >= 1 ? 'AVAILABLE' : 'LOCKED';
  return 'LOCKED';
}

export function basecampStage(save: SaveData): number {
  return Object.values(save.facilities).reduce((stage, f) => {
    const def = FACILITIES[f.facilityId];
    return f.built && def?.basecampStageAfterBuild ? Math.max(stage, def.basecampStageAfterBuild) : stage;
  }, 1);
}

// ---- Opportunities / Performance ---------------------------------------------------------
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
export function songList(save: SaveData) {
  return Object.values(save.songs).sort((a, b) => a.createdWeek - b.createdWeek);
}

export function conditionWord(v: number): string {
  if (v >= 75) return '좋음';
  if (v >= 50) return '보통';
  if (v >= 30) return '낮음';
  return '위험';
}
