// Master Data aggregate (Character Master v1.1 §08 System Architecture: Master Data -> Game Engine -> Save Data).
export * from './types';
export { CHARACTERS, CHARACTER_IDS, FIRST_AUDITION_CANDIDATES } from './characters';
export { TRAITS, traitName } from './traits';
export { CHARACTER_QUOTES, characterQuote } from './quotes';
export { CONTRACT_PROFILES, CLAUSE_LABELS } from './contractProfiles';
export { CONTRACT_V1_PROVISIONAL, CONTRACT_DURATION_OPTIONS } from './contractV1';
export { SYNERGIES } from './synergies';
export { EVENTS } from './events';
export { FACILITIES, VENUES, SLOT_DEFINITIONS, CORE_LINEUP_SLOTS, ACTIVITIES, SESSION_TEMPLATES, MUSIC_TAGS } from './world';
export { PROTOTYPE_BALANCE } from './prototypeBalance';
export * from './career';

export const CONTENT_VERSION = '1.0.0-proto';
