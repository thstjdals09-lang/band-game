// Event master.
// - Character event HOOKS: Character Master v1.1 §15 (ids + titles only; dialogue is written in the VS content phase).
// - EVT_ARIN_01 is the one fully specified EventDefinition example (Character Master §12).
// - EVT_BAND_NAME is a system event defined by IA v1.1 §26 (밴드 이름 이벤트).
import type { EventDefinition } from './types';

const hook = (id: string, characterId: EventDefinition['characterId'], title: string): EventDefinition => ({
  id, type: 'CHARACTER_EVENT', characterId, hook: title, priority: 50, conditions: [], choices: [], scripted: false,
});

export const EVENTS: Record<string, EventDefinition> = {
  EVT_HAJIN_01: hook('EVT_HAJIN_01', 'C01', '첫 바이럴'),
  EVT_HAJIN_02: hook('EVT_HAJIN_02', 'C01', '밴드보다 유명해진 보컬'),
  EVT_YURI_01: hook('EVT_YURI_01', 'C02', '새벽의 데모'),
  EVT_TAEO_01: hook('EVT_TAEO_01', 'C03', '누가 결정하는가'),
  EVT_CHAERIN_01: hook('EVT_CHAERIN_01', 'C04', '망가진 손가락 끝'),
  EVT_CHAERIN_02: hook('EVT_CHAERIN_02', 'C04', 'Riff Machine 각성'),
  EVT_DOYUN_01: hook('EVT_DOYUN_01', 'C05', '이 장비로는 못 친다'),
  EVT_YEJUN_01: hook('EVT_YEJUN_01', 'C06', '이 후렴은 뜬다'),
  EVT_SION_01: hook('EVT_SION_01', 'C07', '서로 다른 네 사람'),
  EVT_RAHI_01: hook('EVT_RAHI_01', 'C08', '개인 팬덤의 탄생'),
  EVT_GUN_01: hook('EVT_GUN_01', 'C09', '이게 밴드 음악이야?'),
  EVT_WOOJAE_01: hook('EVT_WOOJAE_01', 'C10', '열두 번째 도시'),
  EVT_ARIN_01: {
    id: 'EVT_ARIN_01', type: 'CHARACTER_EVENT', characterId: 'C11', hook: '즉흥 솔로', priority: 70,
    conditions: [
      { type: 'CHARACTER_ACTIVE', characterId: 'C11' },
      { type: 'STRESS_ABOVE', value: 60 },
      { type: 'PERFORMANCE_TODAY', value: true },
    ],
    choices: [
      { id: 'LET_HER_IMPROVISE', label: 'LET HER IMPROVISE', effects: ['LIVE_PEAK_UP', 'ACCIDENT_RISK_UP'] },
      { id: 'FOLLOW_SETLIST', label: 'FOLLOW SETLIST', effects: ['STABILITY_UP', 'MORALE_DOWN'] },
    ],
    scripted: true,
  },
  EVT_JAEMIN_01: hook('EVT_JAEMIN_01', 'C12', '그냥 싸우게 둘까'),
  EVT_YUAN_01: hook('EVT_YUAN_01', 'C13', '내가 결정한다'),
  EVT_IHYUN_01: hook('EVT_IHYUN_01', 'C14', '이전 밴드의 그림자'),
  EVT_SEA_01: hook('EVT_SEA_01', 'C15', '다시 만난 오디션 후보'),
  EVT_SEA_02: hook('EVT_SEA_02', 'C15', 'Late Bloomer'),

  // IA v1.1 §26: 밴드 이름은 2명의 핵심 멤버를 영입한 뒤 이벤트에서 정한다.
  EVT_BAND_NAME: {
    id: 'EVT_BAND_NAME', type: 'BAND_EVENT', hook: '이제 이 팀에 이름이 필요하다', priority: 90,
    conditions: [
      { type: 'MEMBER_COUNT_AT_LEAST', value: 2 },
      { type: 'BAND_UNNAMED', value: true },
    ],
    choices: [], // free input + member suggestions (suggestion generation: TODO PHASE2)
    scripted: true,
  },
};
