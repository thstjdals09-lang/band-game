// Master Data aggregate (Character Master v1.1 §08 System Architecture: Master Data -> Game Engine -> Save Data).
export * from './types';
export { CHARACTERS, CHARACTER_IDS, FIRST_AUDITION_CANDIDATES } from './characters';
export { TRAITS, traitName } from './traits';
export { CONTRACT_PROFILES, CLAUSE_LABELS } from './contractProfiles';
export { SYNERGIES } from './synergies';
export { EVENTS } from './events';
export { FACILITIES, VENUES, LINEUP_SLOTS, ACTIVITIES, SESSION_TEMPLATES, MUSIC_TAGS } from './world';

export const CONTENT_VERSION = '1.0.0-proto';
