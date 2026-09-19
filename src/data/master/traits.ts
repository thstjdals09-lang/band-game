// Trait master - ids referenced by CharacterDefinition.visibleTraitIds / hiddenTraitIds.
// Names come from Character Master v1.1 (07 Traits). Effects are NOT defined in v1.1 -> data hooks only.
import type { TraitDefinition } from './types';

const v = (id: string, name: string): TraitDefinition => ({ id, name, defaultVisibility: 'VISIBLE', effects: [] });
const h = (id: string, name: string): TraitDefinition => ({ id, name, defaultVisibility: 'HIDDEN', effects: [] });

export const TRAITS: Record<string, TraitDefinition> = Object.fromEntries(
  [
    v('BORN_PERFORMER', 'Born Performer'), v('IMPULSIVE', 'Impulsive'), h('SPOTLIGHT_HUNGER', 'Spotlight Hunger'),
    v('SENSITIVE_EAR', 'Sensitive Ear'), v('ATMOSPHERE_MAKER', 'Atmosphere Maker'), h('MIDNIGHT_COMPOSER', 'Midnight Composer'),
    v('MULTI_PLAYER', 'Multi-Player'), v('RELIABLE', 'Reliable'), h('CONTROL_FREAK', 'Control Freak'),
    v('PRACTICE_ADDICT', 'Practice Addict'), v('HUMBLE', 'Humble'), h('RIFF_MACHINE', 'Riff Machine'),
    v('VIRTUOSO', 'Virtuoso'), v('PERFECTIONIST', 'Perfectionist'), h('ELITE_MENTALITY', 'Elite Mentality'),
    v('HOOK_SENSE', 'Hook Sense'), v('TREND_READER', 'Trend Reader'), h('HIT_FORMULA', 'Hit Formula'),
    v('TEAM_PLAYER', 'Team Player'), v('GROOVE_SENSE', 'Groove Sense'), h('GLUE', 'Glue'),
    v('FAN_SERVICE', 'Fan Service'), v('EXPRESSIVE', 'Expressive'), h('PARASOCIAL_MAGNET', 'Parasocial Magnet'),
    v('EXPERIMENTALIST', 'Experimentalist'), v('CURIOUS', 'Curious'), h('GENRE_BREAKER', 'Genre Breaker'),
    v('IRON_STAMINA', 'Iron Stamina'), v('PROFESSIONAL', 'Professional'), h('TOUR_MACHINE', 'Tour Machine'),
    v('EXPLOSIVE', 'Explosive'), v('FEARLESS', 'Fearless'), h('PEAK_PERFORMER', 'Peak Performer'),
    v('OBSERVER', 'Observer'), v('MEDIATOR', 'Mediator'), h('BALANCER', 'Balancer'),
    v('AUTEUR', 'Auteur'), v('VISIONARY', 'Visionary'), h('CREATIVE_DOMINION', 'Creative Dominion'),
    v('VETERAN', 'Veteran'), v('CONNECTED', 'Connected'), h('SCENE_REPUTATION', 'Scene Reputation'),
    v('LISTENER', 'Listener'), v('ADAPTABLE', 'Adaptable'), h('LATE_BLOOMER', 'Late Bloomer'), h('GROWTH_BRANCH', 'Branch'),
  ].map((t) => [t.id, t]),
);

export function traitName(id: string): string {
  return TRAITS[id]?.name ?? id;
}
