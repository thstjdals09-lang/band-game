// Facilities / Venues / Lineup slots / Activities / Session templates / Music tags.
import type {
  ActivityDefinition, FacilityDefinition, LineupSlotDefinition, SessionTemplate, VenueDefinition,
} from './types';

// GDD v0.2 §05: 처음은 작은 지하 연습실. 성장하면서 녹음실·사무실·라운지·스타일링룸·장비 공간 등이 확장된다.
// Visual Bible Hero 01: "RECORDING ROOM - SOON..." locked door, "NEXT SPACE", "UPSTAIRS".
// TODO(balance): buildCost / effectSummary / unlockCondition are prototype placeholders.
export const FACILITIES: Record<string, FacilityDefinition> = {
  REHEARSAL_ROOM: {
    id: 'REHEARSAL_ROOM', name: '연습실', description: '낡은 지하 연습실. 모든 것이 여기서 시작한다.',
    unlockCondition: '기본 보유', buildCost: 0, effectSummary: 'Practice 가능',
  },
  RECORDING_ROOM: {
    id: 'RECORDING_ROOM', name: '녹음실', description: '잠긴 옆 공간. 문 위에 "SOON..." 표지가 붙어 있다.',
    unlockCondition: '첫 공연 완료', buildCost: 800000, effectSummary: 'Recording 주간 활동 해금 / 곡 진행 속도 상승',
    basecampStageAfterBuild: 2,
  },
  LOUNGE: {
    id: 'LOUNGE', name: '라운지', description: '휴식과 관계가 쌓이는 공간.',
    unlockCondition: 'Local Act 도달', buildCost: 1200000, effectSummary: 'Rest 효율 상승 / 관계 이벤트',
  },
  OFFICE: {
    id: 'OFFICE', name: '사무실', description: '스태프와 경영 기능의 자리.',
    unlockCondition: 'Local Act 도달', buildCost: 1500000, effectSummary: 'Staff 해금 (후속 확장)',
  },
  STYLING_ROOM: {
    id: 'STYLING_ROOM', name: '스타일링룸', description: '무대 비주얼과 의상.',
    unlockCondition: 'Rising Act 도달', buildCost: 2000000, effectSummary: '무대 비주얼 (후속 확장)',
  },
  EQUIPMENT_ROOM: {
    id: 'EQUIPMENT_ROOM', name: '장비 공간', description: '악기와 장비 보관/업그레이드.',
    unlockCondition: 'Rising Act 도달', buildCost: 1800000, effectSummary: 'Equipment 성장 (후속 확장)',
  },
};

// IA v1.1 §6 example: "Basement Club 공연 제안". Visual Bible Hero 04: "MOONLIGHT CLUB - LIVE HOUSE".
export const VENUES: Record<string, VenueDefinition> = {
  BASEMENT_CLUB: { id: 'BASEMENT_CLUB', name: 'Basement Club', kind: 'CLUB', capacity: 120, region: 'HOME_CITY' },
  MOONLIGHT_CLUB: { id: 'MOONLIGHT_CLUB', name: 'Moonlight Club', kind: 'LIVE_HOUSE', capacity: 300, region: 'HOME_CITY' },
};

// TODO(IA): IA §7 example shows 4 slots (VOCAL/GUITAR/BASS/DRUMS); Visual Bible Hero 03 shows 5/5 incl. KEYBOARD.
// Prototype uses 5 slots; slot count is a Prototype Variable to confirm.
export const LINEUP_SLOTS: LineupSlotDefinition[] = [
  { id: 'VOCAL', label: 'VOCAL', compatiblePositions: ['Vocal', 'Multi'] },
  { id: 'GUITAR', label: 'GUITAR', compatiblePositions: ['Guitar', 'Lead Guitar', 'Multi'] },
  { id: 'BASS', label: 'BASS', compatiblePositions: ['Bass', 'Multi'] },
  { id: 'DRUMS', label: 'DRUMS', compatiblePositions: ['Drums', 'Perc.', 'Multi'] },
  { id: 'KEYS', label: 'KEYS', compatiblePositions: ['Keys', 'Synth', 'Producer', 'Multi'] },
];

// IA v1.1 §15: Main Action 예: Practice / Promotion / Recording / Rest / Live Show.
// Individual Action 예: 개인 레슨 / 휴식 / 인터뷰. TODO(balance): cost values are placeholders.
export const ACTIVITIES: ActivityDefinition[] = [
  { id: 'PRACTICE', scope: 'BAND', name: 'Band Practice', cost: 30000 },
  { id: 'PROMOTION', scope: 'BAND', name: 'Promotion', cost: 80000 },
  { id: 'RECORDING', scope: 'BAND', name: 'Recording', cost: 150000 },
  { id: 'REST', scope: 'BAND', name: 'Rest', cost: 0 },
  { id: 'LIVE_SHOW', scope: 'BAND', name: 'Live Show', cost: 50000 },
  { id: 'PRIVATE_LESSON', scope: 'INDIVIDUAL', name: 'Private Lesson', cost: 60000 },
  { id: 'REST', scope: 'INDIVIDUAL', name: 'Rest', cost: 0 },
  { id: 'INTERVIEW', scope: 'INDIVIDUAL', name: 'Interview', cost: 0 },
];

// Generic (nameless) session musicians - IA §11: 기간, 비용, 대략적 실력/신뢰도 중심.
// TODO(balance): placeholder values.
export const SESSION_TEMPLATES: SessionTemplate[] = [
  { templateId: 'SESSION_VOCAL', label: '세션 보컬', slot: 'VOCAL', weeklyCost: 90000, durationWeeks: 4, roughSkill: '보통', reliability: '보통' },
  { templateId: 'SESSION_GUITAR', label: '세션 기타', slot: 'GUITAR', weeklyCost: 80000, durationWeeks: 4, roughSkill: '보통', reliability: '높음' },
  { templateId: 'SESSION_BASS', label: '세션 베이스', slot: 'BASS', weeklyCost: 70000, durationWeeks: 4, roughSkill: '보통', reliability: '높음' },
  { templateId: 'SESSION_DRUMS', label: '세션 드럼', slot: 'DRUMS', weeklyCost: 85000, durationWeeks: 4, roughSkill: '좋음', reliability: '보통' },
  { templateId: 'SESSION_KEYS', label: '세션 키보드', slot: 'KEYS', weeklyCost: 75000, durationWeeks: 4, roughSkill: '보통', reliability: '높음' },
];

export const MUSIC_TAGS: string[] = [
  'Alt Pop', 'Garage', 'Pop Rock', 'Dream Pop', 'Synth Pop', 'Ambient', 'Brit Rock', 'Indie Rock',
  'Punk', 'Noise Rock', 'Hard Rock', 'Metal', 'Progressive', 'Pop', 'Electronic', 'Funk', 'City Pop',
  'Emo', 'Pop Punk', 'Alternative', 'Electronic Rock', 'Post-Rock', 'Fusion', 'R&B', 'Hardcore',
  'Jazz Rock', 'Neo-Soul', 'Art Rock', 'Experimental', 'Post-Hardcore', 'Indie Pop', 'Alternative Pop', 'Soul Pop',
];
