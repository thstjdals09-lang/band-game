// Creates the initial SaveData for a new game (IA §26: producer name only, then straight to Basecamp / first Audition).
import {
  CHARACTER_IDS, CHARACTERS, CONTENT_VERSION, FACILITIES, FIRST_AUDITION_CANDIDATES,
  type CharacterId,
} from '@/data/master';
import { SAVE_SCHEMA_VERSION, type CharacterState, type SaveData, type WorldStatus } from './schema';

// TODO(balance): starting values are prototype placeholders.
// Anchors: Visual Bible Hero 02 HUD shows "YEAR 1 WEEK 1 / ₩3,000,000 / 100 fans / ★10".
const START_CASH = 3_000_000;
const START_FANS = 100;
const START_FAME = 10;

function initialWorldStatus(id: CharacterId): WorldStatus {
  if (FIRST_AUDITION_CANDIDATES.includes(id)) return 'AVAILABLE';
  const routes = CHARACTERS[id].recruitmentProfile.routes;
  if (routes.includes('OPEN_AUDITION')) return 'KNOWN';
  return 'LOCKED';
}

function initialCharacterState(id: CharacterId): CharacterState {
  const def = CHARACTERS[id];
  const traitStates: CharacterState['traitStates'] = {};
  def.visibleTraitIds.forEach((t) => { traitStates[t] = 'DISCOVERED'; });
  def.hiddenTraitIds.forEach((t) => { traitStates[t] = 'HIDDEN'; });
  return {
    characterId: id,
    worldStatus: initialWorldStatus(id),
    currentStats: {},
    condition: { energy: 80, stress: 20, morale: 70 },
    traitStates,
    growth: { experience: 0, developmentStage: 0 },
    personalPopularity: 0,
    careerStage: 'ROOKIE',
    visualStage: 1,
  };
}

export function createNewGame(producerName: string): SaveData {
  const characterStates: SaveData['characterStates'] = {};
  CHARACTER_IDS.forEach((id) => { characterStates[id] = initialCharacterState(id); });

  const facilities: SaveData['facilities'] = {};
  Object.keys(FACILITIES).forEach((fid) => {
    facilities[fid] = { facilityId: fid, level: fid === 'REHEARSAL_ROOM' ? 1 : 0, built: fid === 'REHEARSAL_ROOM' };
  });

  const revealedInformation: SaveData['auditions'][string]['revealedInformation'] = {};
  FIRST_AUDITION_CANDIDATES.forEach((id) => {
    // Character Master §10 AuditionState example: ["BASE_STATS","MUSIC_TAGS","TRAIT_1"] (+ contract burden shown on the first card, GDD §04)
    revealedInformation[id] = ['BASE_STATS', 'MUSIC_TAGS', 'TRAIT_1', 'CONTRACT_BURDEN'];
  });

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersionAtCreation: CONTENT_VERSION,
    player: { producerName: producerName.trim() || 'PRODUCER', createdAt: new Date().toISOString() },
    world: { year: 1, week: 1, unlockedRegions: ['HOME_CITY'], careerTier: 'UNKNOWN', generation: 1, unlockedCharacterPool: ['GEN_1'] },
    band: {
      name: null,
      careerTier: 'UNKNOWN',
      officialLeaderCharacterId: null,
      activeMembers: [],
      lineup: { VOCAL: null, GUITAR: null, BASS: null, DRUMS: null, KEYS: null },
      brandTags: [],
      metrics: { fans: START_FANS, fanLoyalty: 0, fame: START_FAME, reputation: 0, musicalReputation: 0 },
    },
    characterStates,
    relationships: [],
    contracts: {},
    songs: {},
    releases: {},
    facilities,
    staff: {},
    auditions: {
      AUD_0001: {
        auditionId: 'AUD_0001', type: 'OPEN', createdWeek: 1, expiresWeek: 4,
        candidateIds: [...FIRST_AUDITION_CANDIDATES],
        revealedInformation, shortlistIds: [], compareIds: [], status: 'OPEN',
      },
    },
    sessionHires: {},
    weeklyPlan: { mainActions: [null, null, null], individualActions: [] },
    opportunities: {},
    pendingPerformance: null,
    eventHistory: [],
    performanceHistory: [],
    careerHistory: [{ week: 1, type: 'MILESTONE', text: '작은 지하 연습실에서 시작했다.' }],
    economy: { cash: START_CASH, ledger: [] },
    rng: { baseSeed: Math.floor(Math.random() * 2 ** 31), streams: { audition: 0, events: 0, performance: 0, world: 0 } },
    counters: { song: 0, session: 0, audition: 1, opportunity: 0, performance: 0 },
  };
}
