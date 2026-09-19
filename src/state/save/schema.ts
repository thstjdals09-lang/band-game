// SaveData v1 - Character Master v1.1 §09-§14.
// Save holds references + changed state only. Master definitions are never copied into the save.
// Map-first storage: fixed-id data uses objects keyed by id (characterStates["C04"]).
//
// APPROVED prototype fields (PHASE 1.1 structure review) - part of SaveData v1, no schemaVersion bump:
//  - band.lineup                         : variable ordered slot list (Lineup/Members separation, role assignment)
//  - auditions[].shortlistIds/compareIds : Shortlist + Compare (IA §12)
//  - opportunities                       : Opportunity Inbox (IA §6)
//  - pendingPerformance                  : accepted live offer -> Prep -> Performance link
//  - counters                            : monotonic id counters (song_00018 style ids)
// Missing fields on a persisted v1 save are filled by save/migrate.ts (ensureSaveDefaults).
import type { CharacterId, IndividualActionId, MainActionId, MusicDNA, SlotId, VisibleStats } from '@/data/master';

export const SAVE_SCHEMA_VERSION = 1 as const;

export type WorldStatus =
  | 'KNOWN' | 'AVAILABLE' | 'LOCKED' | 'SIGNED_OTHER_BAND'
  | 'SESSION_AVAILABLE' | 'PLAYER_MEMBER' | 'FORMER_MEMBER' | 'RETIRED';

export type CareerTier = 'UNKNOWN' | 'LOCAL_ACT' | 'RISING_ACT' | 'MAJOR' | 'STAR' | 'WORLD_ICON';

export interface PlayerState {
  producerName: string;
  createdAt: string; // ISO
}

export interface WorldState {
  year: number;
  week: number;
  unlockedRegions: string[];
  careerTier: CareerTier;
  generation: number;
  unlockedCharacterPool: string[];
}

export interface CharacterCondition {
  energy: number;
  stress: number;
  morale: number;
}

export interface CharacterState {
  characterId: CharacterId;
  worldStatus: WorldStatus;
  joinedWeek?: number;
  currentStats: Partial<VisibleStats>; // deltas/overrides vs master; empty = master values
  condition: CharacterCondition;
  traitStates: Record<string, 'HIDDEN' | 'DISCOVERED'>;
  growth: { experience: number; developmentStage: number };
  personalPopularity: number;
  careerStage: 'ROOKIE' | 'GROWTH' | 'PRIME' | 'VETERAN';
  visualStage: number;
}

/** One record per pair. Never create both A->B and B->A. */
export interface RelationshipEdge {
  characterA: CharacterId;
  characterB: CharacterId;
  affinity: number;
  respect: number;
  tension: number;
  relationshipTags: string[];
  discoveredSynergies: string[];
}

export interface ContractState {
  characterId: CharacterId;
  salary: number;
  startWeek: number;
  endWeek: number;
  rolePromise: 'CORE_MEMBER' | 'SUPPORT_MEMBER';
  clauses: string[];
  satisfaction: number;
}

export type SongStatus =
  | 'UNRELEASED' | 'DEMO' | 'SAVED_FOR_EP'
  // One status per release format, so an EP track is not recorded as a single.
  // Saves written before this existed only ever hold RELEASED_SINGLE and stay valid.
  | 'RELEASED_SINGLE' | 'RELEASED_EP' | 'RELEASED_ALBUM';

const RELEASED_STATUSES: SongStatus[] = ['RELEASED_SINGLE', 'RELEASED_EP', 'RELEASED_ALBUM'];
/** Has this song been put out in any format? */
export function isReleased(status: SongStatus): boolean {
  return RELEASED_STATUSES.includes(status);
}

export interface SongState {
  id: string;
  title: string;
  createdWeek: number;
  contributors: { composer: CharacterId[]; lyrics: CharacterId[] };
  originContext: string[];
  musicProfile: { popularity: number; artistry: number; fanFit: number; liveFit: number };
  /** Music DNA the song was written with (PHASE 2A). Older saves may not have it. */
  musicDna?: MusicDNA;
  genreTags: string[];
  status: SongStatus;
  /**
   * Absolute week the demo was turned into a finished recording. Only a recorded song can be
   * released (v1 규칙 4). Songs from older saves have no field and count as unrecorded.
   */
  recordedWeek?: number | null;
  /**
   * How many rehearsal slots have been spent preparing this song for the stage (v1 규칙 2).
   * Recorded as history only — no live-mastery effect is connected yet, see selectors.
   */
  rehearsalCount?: number;
}

/** Only a recorded song can be released (v1 규칙 4). */
export function isRecorded(song: Pick<SongState, 'recordedWeek'>): boolean {
  return typeof song.recordedWeek === 'number';
}

export interface ReleaseState {
  id: string;
  type: 'SINGLE' | 'EP' | 'ALBUM';
  songIds: string[];
  /** Absolute week (year-aware) so streaming decay works across a year boundary. */
  releasedWeek: number;
  /** Snapshot of what this release did, kept as history (Character Master §14). */
  result?: { revenue: number; fansDelta: number; reputationDelta: number; popularity: number };
}

export interface FacilityState {
  facilityId: string;
  level: number;
  built: boolean;
}

export type RevealKey =
  | 'BASE_STATS' | 'MUSIC_TAGS' | 'TRAIT_1' | 'TRAIT_2' | 'CONTRACT_BURDEN'
  | 'INTERVIEW' | 'JAM_SESSION' | 'BACKGROUND_CHECK';

export interface AuditionState {
  auditionId: string;
  type: 'OPEN';
  createdWeek: number;
  expiresWeek: number;
  candidateIds: CharacterId[];
  revealedInformation: Partial<Record<CharacterId, RevealKey[]>>;
  shortlistIds: CharacterId[];
  compareIds: CharacterId[];
  status: 'OPEN' | 'CLOSED';
}

/** Generic session musicians only. Fixed characters (C13/C15) use their Cxx id, never an instanceId. */
export interface SessionHireState {
  instanceId: string; // session_00042
  templateId: string;
  slot: SlotId;
  hiredWeek: number;
  endWeek: number;
  weeklyCost: number;
}

export type LineupAssignment =
  | { kind: 'MEMBER'; characterId: CharacterId }
  | { kind: 'SESSION'; instanceId: string };

/**
 * One active lineup slot. band.lineup is an ORDERED, VARIABLE-LENGTH list:
 * new bands start with the core positions (VOCAL/GUITAR/BASS/DRUMS); positions such as KEYS
 * are appended later by band composition / growth features. Duplicate slotIds are allowed by
 * the type (e.g. a second GUITAR) - uniqueness rules are a PHASE 2+ design decision.
 */
export interface LineupSlotState {
  slotId: SlotId;
  assignment: LineupAssignment | null;
}

export interface BandState {
  name: string | null; // null until EVT_BAND_NAME (IA §26)
  careerTier: CareerTier;
  officialLeaderCharacterId: CharacterId | null;
  activeMembers: CharacterId[];
  lineup: LineupSlotState[];
  brandTags: string[];
  metrics: { fans: number; fanLoyalty: number; fame: number; reputation: number; musicalReputation: number };
}

export interface IndividualPlan {
  characterId: CharacterId;
  actionId: IndividualActionId;
}

/**
 * What this week's creative slots are pointed at (v1 규칙 1·2·3·5).
 * Fixed when NEXT WEEK is pressed; a song written this week cannot be a target this week.
 */
export interface SongWorkPlan {
  /** A new demo is booked from the Songs screen; without it rehearsal writes nothing. */
  newSong: boolean;
  /** Song the remaining rehearsal slots prepare for the stage. null = follow the opening song. */
  rehearsalSongId: string | null;
  /** Demo the recording slot turns into a releasable master. */
  recordingSongId: string | null;
}

export const EMPTY_SONG_WORK: SongWorkPlan = { newSong: false, rehearsalSongId: null, recordingSongId: null };

export interface WeeklyPlan {
  mainActions: (MainActionId | null)[]; // 3 slots (SOFT LOCK, IA §15)
  individualActions: IndividualPlan[];  // 1~2
  songWork: SongWorkPlan;
}

export type OpportunityType = 'LIVE' | 'MEDIA' | 'RECRUITMENT' | 'SPECIAL_AUDITION' | 'EQUIPMENT' | 'LABEL';
export type OpportunityStatus = 'NEW' | 'SEEN' | 'ACCEPTED' | 'DECLINED' | 'LATER' | 'EXPIRED';

export interface OpportunityState {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  createdWeek: number;
  expiresWeek: number;
  status: OpportunityStatus;
  payload?: { venueId?: string };
}

export interface PendingPerformance {
  opportunityId: string;
  venueId: string;
  openingSongId: string | null;
  status: 'SCHEDULED' | 'DONE';
}

export interface EventHistoryEntry {
  eventId: string;
  week: number;
  choiceId?: string;
}

/** Historical snapshot - stored with values at that time, never recomputed. */
export interface PerformanceSnapshot {
  id: string;
  week: number;
  venueId: string;
  venueName: string;
  lineup: { slot: SlotId; label: string }[];
  openingSongTitle: string;
  audience: number;
  grade: 'DISASTER' | 'OKAY' | 'GOOD SHOW' | 'GREAT SHOW';
  revenue: number;
  fansDelta: number;
  reputationDelta: number;
  crowdEnergyPeak: number;
  choices: { prompt: string; choiceId: string }[];
}

export interface CareerHistoryEntry {
  week: number;
  type: 'MILESTONE' | 'LINEUP_CHANGE' | 'CONTRACT' | 'RELEASE' | 'FACILITY' | 'BAND';
  text: string;
}

export interface EconomyState {
  cash: number;
  ledger: { week: number; label: string; amount: number }[];
}

export interface RngState {
  baseSeed: number;
  streams: { audition: number; events: number; performance: number; world: number };
}

export interface SaveCounters {
  song: number; session: number; audition: number; opportunity: number; performance: number;
  /** Added in PHASE 2A; ensureSaveDefaults backfills it for older saves. */
  release: number;
}

export interface SaveData {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  contentVersionAtCreation: string;
  player: PlayerState;
  world: WorldState;
  band: BandState;
  characterStates: Partial<Record<CharacterId, CharacterState>>;
  relationships: RelationshipEdge[];
  contracts: Partial<Record<CharacterId, ContractState>>;
  songs: Record<string, SongState>;
  releases: Record<string, ReleaseState>;
  facilities: Record<string, FacilityState>;
  staff: Record<string, unknown>; // shell
  auditions: Record<string, AuditionState>;
  sessionHires: Record<string, SessionHireState>;
  weeklyPlan: WeeklyPlan;
  opportunities: Record<string, OpportunityState>;
  pendingPerformance: PendingPerformance | null;
  eventHistory: EventHistoryEntry[];
  performanceHistory: PerformanceSnapshot[];
  careerHistory: CareerHistoryEntry[];
  economy: EconomyState;
  rng: RngState;
  counters: SaveCounters;
}
