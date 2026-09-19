// DEV TEST PRESETS - manual QA fixtures. NOT a player feature: reachable only from /dev,
// never from the Dock or any game screen.
//
// Presets are built by replaying the real actions (newGame -> signContract -> commitWeek -> ...)
// so they always produce a structurally valid SaveData through the normal architecture.
// The only direct save touch is the documented trim in TWO_SONGS_READY.
import { useGameStore } from './store';
import { auditionActions, bandActions, facilityActions, opportunityActions, performanceActions, scheduleActions } from './actions';
import { FACILITIES, PROTOTYPE_BALANCE, VENUES, type CharacterId } from '@/data/master';
import { lineupView, songList } from './selectors';

export type PresetId =
  | 'NEW_GAME' | 'TWO_MEMBERS' | 'TWO_MEMBERS_NAMED' | 'SESSION_READY'
  | 'TWO_SONGS_READY' | 'OPPORTUNITY_READY' | 'PERFORMANCE_PREP_READY'
  | 'FACILITY_BUILD_READY' | 'POST_FACILITY_BUILD';

export interface PresetDef {
  id: PresetId;
  label: string;
  description: string;
  /** Route to open after applying, so QA lands on the screen under test. */
  route: string;
}

export const PRESETS: PresetDef[] = [
  { id: 'NEW_GAME', label: 'A · 새 게임', description: '완전 초기 상태', route: '/' },
  { id: 'TWO_MEMBERS', label: 'B · 2명 영입 (이름 전)', description: '윤하진 + 민채린, 밴드명 미정 (Band Name Event 직전)', route: '/band' },
  { id: 'TWO_MEMBERS_NAMED', label: 'B2 · 2명 영입 (이름 완료)', description: '윤하진 + 민채린, 밴드명 설정 완료', route: '/band' },
  { id: 'SESSION_READY', label: 'C · 세션 고용 검수', description: '2명 영입, BASS/DRUMS 빈 슬롯', route: '/band' },
  { id: 'TWO_SONGS_READY', label: 'D · 2곡 보유', description: '밴드명 설정, 2곡 보유, 공연 제안 생성 가능 상태', route: '/band/songs' },
  { id: 'OPPORTUNITY_READY', label: 'E · 공연 제안 도착', description: 'Basement Club 제안이 Inbox에 있음', route: '/inbox' },
  { id: 'PERFORMANCE_PREP_READY', label: 'F · 공연 수락 완료', description: '제안 수락, Performance Prep 직전', route: '/performance/prep' },
  { id: 'FACILITY_BUILD_READY', label: 'G · 시설 건설 가능', description: '첫 공연 완료, 녹음실 건설 조건 충족', route: '/management/facilities' },
  { id: 'POST_FACILITY_BUILD', label: 'H · 시설 건설 후', description: '녹음실 완성, Basecamp 2단계', route: '/' },
];

const HAJIN: CharacterId = 'C01';
const CHAERIN: CharacterId = 'C04';
const AUD = 'AUD_0001';

const save = () => useGameStore.getState().save!;

function signTwoMembers() {
  useGameStore.getState().newGame('QA');
  auditionActions.signContract(AUD, HAJIN, { salary: 400000, durationWeeks: 52, rolePromise: 'CORE_MEMBER' });
  auditionActions.signContract(AUD, CHAERIN, { salary: 180000, durationWeeks: 104, rolePromise: 'CORE_MEMBER' });
}

/** Run one creative week: plan practice, then commit with the next scripted demo title. */
function creativeWeek() {
  scheduleActions.setMainAction(0, 'PRACTICE');
  const n = songList(save()).length + 1;
  scheduleActions.commitWeek({ newSongTitle: `Untitled Demo ${String(n).padStart(2, '0')}` });
}

function reachTwoSongs() {
  while (songList(save()).length < PROTOTYPE_BALANCE.songs.minSongsForDebut) creativeWeek();
}

function acceptLiveOffer(): string | null {
  const offer = Object.values(save().opportunities).find((o) => o.type === 'LIVE' && o.status !== 'DECLINED');
  if (!offer) return null;
  opportunityActions.accept(offer.id);
  return offer.id;
}

/** Play a scripted show so a performance snapshot exists (unlocks the recording room). */
function playDebutShow() {
  const s = save();
  const songs = songList(s);
  if (!s.pendingPerformance || songs.length === 0) return;
  performanceActions.setOpeningSong(songs[0].id);
  const venue = VENUES[s.pendingPerformance.venueId];
  const lineup = lineupView(save()).filter((x) => x.kind !== 'EMPTY');
  const B = PROTOTYPE_BALANCE.performance;
  const audience = Math.min(venue.capacity, B.baseAudience + Math.round(s.band.metrics.fans * B.audiencePerFan));
  performanceActions.commit({
    venueId: venue.id, venueName: venue.name,
    lineup: lineup.map((x) => ({ slot: x.slot, label: x.displayName ?? '' })),
    openingSongTitle: songs[0].title,
    audience, grade: 'GOOD SHOW',
    revenue: audience * B.ticketRevenue,
    fansDelta: Math.round(audience * B.fansPerAudience),
    reputationDelta: B.reputationDelta['GOOD SHOW'],
    crowdEnergyPeak: 70,
    choices: [{ prompt: 'QA preset', choiceId: 'PLAN' }],
  });
}

export function applyPreset(id: PresetId): string {
  const store = useGameStore.getState();
  switch (id) {
    case 'NEW_GAME':
      store.newGame('QA');
      break;

    case 'TWO_MEMBERS':
      signTwoMembers();
      break;

    case 'TWO_MEMBERS_NAMED':
    case 'SESSION_READY':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      break;

    case 'TWO_SONGS_READY':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      reachTwoSongs();
      // Dev fixture only: clear the offer that the second creative week spawns so this preset
      // represents "2곡 보유 · 제안은 아직 도착 전". Structure stays valid (empty map + counter reset).
      store.update((d) => { d.opportunities = {}; d.counters.opportunity = 0; });
      break;

    case 'OPPORTUNITY_READY':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      reachTwoSongs();
      break;

    case 'PERFORMANCE_PREP_READY':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      reachTwoSongs();
      acceptLiveOffer();
      break;

    case 'FACILITY_BUILD_READY':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      reachTwoSongs();
      acceptLiveOffer();
      playDebutShow();
      break;

    case 'POST_FACILITY_BUILD':
      signTwoMembers();
      bandActions.setBandName('QA BAND');
      reachTwoSongs();
      acceptLiveOffer();
      playDebutShow();
      facilityActions.build('RECORDING_ROOM', FACILITIES.RECORDING_ROOM.buildCost);
      break;
  }
  return PRESETS.find((p) => p.id === id)?.route ?? '/';
}
