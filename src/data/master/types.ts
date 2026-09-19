// Master Data types - derived from Band_Game_Character_Master_System_Architecture_v1.1
// (Section 09 CharacterDefinition, 04 Core/Hidden Stats, 05 Music DNA, 06 Personality, 07 Traits/Rarity/Contract).
// Master data is authored by the developer and NEVER mutated at runtime. Runtime changes live in SaveData.

export type CharacterId =
  | 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06' | 'C07' | 'C08'
  | 'C09' | 'C10' | 'C11' | 'C12' | 'C13' | 'C14' | 'C15';

/** Position labels exactly as written in Character Master v1.1 (02 Character Pool). */
export type Position =
  | 'Vocal' | 'Guitar' | 'Lead Guitar' | 'Bass' | 'Drums'
  | 'Keys' | 'Synth' | 'Producer' | 'Perc.' | 'Multi';

/** Lineup slot ids used by BAND / LINEUP (IA v1.1 §7-8). */
export type SlotId = 'VOCAL' | 'GUITAR' | 'BASS' | 'DRUMS' | 'KEYS';

export interface VisibleStats {
  skill: number;    // 실력
  creative: number; // 창의성
  stage: number;    // 무대력
  star: number;     // 스타성
  pro: number;      // 프로의식
}

export interface HiddenStats {
  composing: number;     // 작곡
  lyrics: number;        // 작사
  stamina: number;       // 체력
  mental: number;        // 멘탈
  liveStability: number; // 라이브 안정
  adaptability: number;  // 적응력
}

export type GrowthCurve =
  | 'EARLY_FAST' | 'MID_BLOOM' | 'BALANCED' | 'LATE_EXPONENTIAL'
  | 'HIGH_START_SLOW' | 'HIGH_START' | 'BALANCED_HIGH' | 'STABLE'
  | 'PLATEAU' | 'BURST' | 'VETERAN' | 'LATE_BRANCHING';

export interface GrowthProfile {
  overallPotential: number;
  curve: GrowthCurve;
  statBias?: Partial<VisibleStats>; // TODO(doc): statBias not specified in v1.1 - left empty.
}

/** 5-axis continuous values, -100..+100 (Character Master 05). */
export interface MusicDNA {
  accessibility: number; // 실험적(-) .. 대중적(+)
  texture: number;       // 날것(-) .. 정제됨(+)
  energy: number;        // 부드러움(-) .. 공격적(+)
  focus: number;         // 분위기(-) .. 그루브(+)
  tone: number;          // 어두움(-) .. 밝음(+)
}

export interface Personality {
  sociability: number;     // 사교성
  competitiveness: number; // 경쟁성
  ego: number;             // Ego
  tolerance: number;       // 관용
  leadershipDrive: number; // 리더욕구
  riskTolerance: number;   // 위험선호
}

/** Internal rarity - NEVER read directly by UI (Implementation Guardrails). */
export type InternalRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export type RecruitmentRoute =
  | 'OPEN_AUDITION'
  | 'PREMIUM_AUDITION'
  | 'PRODUCER_RECOMMENDATION'
  | 'UNDERGROUND_EVENT'
  | 'SESSION_SPECIAL_SHOW'
  | 'RIVAL_SCENE_EVENT'
  | 'AUDITION_REJECT_SESSION_RETURN';

export interface RecruitmentProfile {
  routes: RecruitmentRoute[];
  note: string; // 기본 발견 경로 text from the doc
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  generation: number;
  positions: Position[];
  archetype: string;
  selectionReason: string; // 핵심 선택 이유
  summary: string;         // Character Detail description sentence(s)
  visibleStats: VisibleStats;
  hiddenStats: HiddenStats;
  growthProfile: GrowthProfile;
  musicDNA: MusicDNA;
  musicTags: string[];
  personality: Personality;
  visibleTraitIds: string[];
  hiddenTraitIds: string[];
  traitEvolutionIds: string[]; // TODO(doc): evolution chains not defined in v1.1
  contractProfileId: string;
  recruitmentProfile: RecruitmentProfile;
  internalRarity: InternalRarity;
  eventIds: string[];
  specialSynergyIds: string[];
}

export interface TraitDefinition {
  id: string;
  name: string;
  defaultVisibility: 'VISIBLE' | 'HIDDEN';
  // TODO(PHASE2+): effect definitions are not specified in v1.1; keep as data hooks.
  effects: string[];
}

export type ContractBurden = '$' | '$$' | '$$$';

export type ContractClause =
  | 'CREATIVE_CONTROL'
  | 'PERSONAL_ACTIVITY'
  | 'EQUIPMENT_DEMAND'
  | 'VETERAN_STATUS'
  | 'PRODUCER_RIGHTS';

export interface ContractProfileDefinition {
  id: string;
  label: string;
  burden: ContractBurden;
  baseSalary: number;         // per week - TODO(balance)
  preferredDurationWeeks: number;
  clauses: ContractClause[];
}

export interface SynergyDefinition {
  id: string;
  name: string;
  pair: [CharacterId, CharacterId];
  effect: string; // 효과 / 대가 text
}

export type EventConditionType =
  | 'CHARACTER_ACTIVE' | 'STRESS_ABOVE' | 'PERFORMANCE_TODAY'
  | 'BAND_UNNAMED' | 'MEMBER_COUNT_AT_LEAST';

export interface EventCondition {
  type: EventConditionType;
  characterId?: CharacterId;
  value?: number | boolean;
}

export interface EventChoice {
  id: string;
  label: string;
  effects: string[];
}

export interface EventDefinition {
  id: string;
  type: 'CHARACTER_EVENT' | 'BAND_EVENT' | 'SYSTEM_EVENT';
  characterId?: CharacterId;
  hook: string;       // 이벤트 훅 title (Character Master 15)
  priority: number;
  conditions: EventCondition[];
  choices: EventChoice[];
  // TODO(VS content): 실제 대사는 Vertical Slice 콘텐츠 제작 단계에서 작성 (Character Master 15).
  scripted: boolean;  // true = full definition available; false = hook/id only
}

export interface FacilityDefinition {
  id: string;
  name: string;
  description: string;
  unlockCondition: string; // human readable for shell
  buildCost: number;       // TODO(balance)
  effectSummary: string;
  basecampStageAfterBuild?: number; // visual stage change (IA §22)
}

export interface VenueDefinition {
  id: string;
  name: string;
  kind: 'LIVE_HOUSE' | 'CLUB';
  capacity: number; // TODO(balance)
  region: 'HOME_CITY';
}

export type MainActionId = 'PRACTICE' | 'PROMOTION' | 'RECORDING' | 'REST' | 'LIVE_SHOW';
export type IndividualActionId = 'PRIVATE_LESSON' | 'REST' | 'INTERVIEW';

export interface ActivityDefinition {
  id: MainActionId | IndividualActionId;
  scope: 'BAND' | 'INDIVIDUAL';
  name: string;
  cost: number; // TODO(balance) projected expense contribution
}

export interface SessionTemplate {
  templateId: string;
  label: string;         // e.g. "세션 베이시스트"
  slot: SlotId;
  weeklyCost: number;    // TODO(balance)
  durationWeeks: number;
  roughSkill: string;    // 대략적 실력 text
  reliability: string;   // 신뢰도 text
}

export interface LineupSlotDefinition {
  id: SlotId;
  label: string;
  compatiblePositions: Position[];
}
