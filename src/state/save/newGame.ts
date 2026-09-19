// Creates the initial SaveData for a new game (IA §26: producer name only, then straight to Basecamp / first Audition).
import {
  CHARACTER_IDS, CHARACTERS, CONTENT_VERSION, CORE_LINEUP_SLOTS, FACILITIES, FIRST_AUDITION_CANDIDATES,
  PROTOTYPE_BALANCE, type CharacterId,
} from '@/data/master';
import { EMPTY_SONG_WORK, SAVE_SCHEMA_VERSION, type CharacterState, type SaveData, type WorldStatus } from './schema';

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
    condition: { ...PROTOTYPE_BALANCE.start.condition },
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
      // Variable slot list: VS default = 4 core positions. Expansion slots are appended later.
      lineup: CORE_LINEUP_SLOTS.map((slotId) => ({ slotId, assignment: null })),
      brandTags: [],
      metrics: {
        fans: PROTOTYPE_BALANCE.start.fans, fanLoyalty: 0, fame: PROTOTYPE_BALANCE.start.fame, reputation: 0, musicalReputation: 0,
      },
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
        auditionId: 'AUD_0001', type: 'OPEN', createdWeek: 1, expiresWeek: PROTOTYPE_BALANCE.audition.firstAuditionExpiresWeek,
        candidateIds: [...FIRST_AUDITION_CANDIDATES],
        revealedInformation, shortlistIds: [], compareIds: [], status: 'OPEN',
      },
    },
    sessionHires: {},
    weeklyPlan: { mainActions: [null, null, null], individualActions: [], songWork: { ...EMPTY_SONG_WORK } },
    opportunities: {},
    pendingPerformance: null,
    eventHistory: [],
    performanceHistory: [],
    careerHistory: [{ week: 1, type: 'MILESTONE', text: '작은 지하 연습실에서 시작했다.' }],
    economy: { cash: PROTOTYPE_BALANCE.start.cash, ledger: [] },
    rng: { baseSeed: Math.floor(Math.random() * 2 ** 31), streams: { audition: 0, events: 0, performance: 0, world: 0 } },
    counters: { song: 0, session: 0, audition: 1, opportunity: 0, performance: 0, release: 0 },
  };
}
