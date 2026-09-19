// schemaVersion migration entry point (Character Master §13 Versioning).
// schemaVersion = structural migration; contentVersionAtCreation = balance/content tracking only.
//
// Two layers:
//  1. migrateSave()         - version step-ups (none yet; v1 only).
//  2. ensureSaveDefaults()  - same-version fallback: fills approved prototype fields that an older
//     v1 save (from an earlier prototype build) may lack, and normalises band.lineup to the
//     variable slot list shape. Runs on every load so persisted saves never break the UI.
import { CORE_LINEUP_SLOTS, type SlotId } from '@/data/master';
import { EMPTY_SONG_WORK, isReleased, SAVE_SCHEMA_VERSION, type LineupSlotState, type SaveData } from './schema';

const EMPTY_COUNTERS = { song: 0, session: 0, audition: 0, opportunity: 0, performance: 0, release: 0 };

function normaliseLineup(raw: unknown): LineupSlotState[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((s): s is LineupSlotState => !!s && typeof s === 'object' && typeof (s as LineupSlotState).slotId === 'string')
      .map((s) => ({ slotId: s.slotId, assignment: s.assignment ?? null }));
  }
  if (raw && typeof raw === 'object') {
    // earlier prototype shape: Record<SlotId, LineupAssignment | null>
    const rec = raw as Record<string, LineupSlotState['assignment']>;
    const ids = [...CORE_LINEUP_SLOTS, ...Object.keys(rec).filter((k) => !CORE_LINEUP_SLOTS.includes(k as SlotId) && rec[k])] as SlotId[];
    return ids.map((slotId) => ({ slotId, assignment: rec[slotId] ?? null }));
  }
  return CORE_LINEUP_SLOTS.map((slotId) => ({ slotId, assignment: null }));
}

export function ensureSaveDefaults(input: SaveData): SaveData {
  const s = input as SaveData & Record<string, unknown>;
  s.band.lineup = normaliseLineup((s.band as unknown as { lineup: unknown }).lineup);
  s.opportunities = s.opportunities ?? {};
  s.pendingPerformance = s.pendingPerformance ?? null;
  s.counters = { ...EMPTY_COUNTERS, ...(s.counters ?? {}) };
  s.staff = s.staff ?? {};
  s.releases = s.releases ?? {};
  s.eventHistory = s.eventHistory ?? [];
  s.performanceHistory = s.performanceHistory ?? [];
  s.careerHistory = s.careerHistory ?? [];
  s.contractExceptions = s.contractExceptions ?? [];
  // 기존 계약의 주급·기간·역할은 소급 변경하지 않는다. 새로 생긴 필드만 채운다.
  Object.values(s.contracts ?? {}).forEach((c) => {
    if (!c) return;
    c.renewal = c.renewal ?? null;
    c.pendingChange = c.pendingChange ?? null;
  });
  s.relationships = s.relationships ?? [];
  s.sessionHires = s.sessionHires ?? {};
  Object.values(s.auditions ?? {}).forEach((a) => {
    a.shortlistIds = a.shortlistIds ?? [];
    a.compareIds = a.compareIds ?? [];
    a.revealedInformation = a.revealedInformation ?? {};
  });
  if (!s.weeklyPlan) s.weeklyPlan = { mainActions: [null, null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } };
  // Saves written before song work existed simply have no reservation this week.
  s.weeklyPlan.songWork = { ...EMPTY_SONG_WORK, ...(s.weeklyPlan.songWork ?? {}) };
  Object.values(s.songs ?? {}).forEach((song) => {
    song.rehearsalCount = song.rehearsalCount ?? 0;
    // A song released before recording existed was obviously finished; keep it releasable.
    if (song.recordedWeek === undefined) song.recordedWeek = isReleased(song.status) ? song.createdWeek : null;
  });
  return s;
}

export function migrateSave(input: SaveData): SaveData {
  if (input.schemaVersion !== SAVE_SCHEMA_VERSION) {
    // TODO(PHASE2+): add stepwise migrations when schemaVersion increments.
    throw new Error(`Unsupported save schemaVersion: ${String((input as { schemaVersion: unknown }).schemaVersion)}`);
  }
  return ensureSaveDefaults(input);
}
