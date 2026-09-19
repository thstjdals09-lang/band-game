// Contract Profile master - ids from Character Master v1.1 (07).
// Clause mapping follows IA v1.1 §14 (Creative Control / 개인 활동 / 장비 요구 / Veteran Status).
// TODO(balance): burden / baseSalary / duration are PROTOTYPE PLACEHOLDER values.
// Only documented anchors: 윤하진 contract burden "$$" (Visual Bible Hero 02), C13 salary 900000 (Character Master 10).
import type { ContractProfileDefinition } from './types';

const p = (
  id: string, label: string, burden: ContractProfileDefinition['burden'],
  baseSalary: number, preferredDurationWeeks: number,
  clauses: ContractProfileDefinition['clauses'] = [],
): ContractProfileDefinition => ({ id, label, burden, baseSalary, preferredDurationWeeks, clauses });

export const CONTRACT_PROFILES: Record<string, ContractProfileDefinition> = Object.fromEntries(
  [
    p('FRONTMAN_AMBITIOUS', '야심 있는 프론트맨', '$$', 400000, 52),
    p('ARTIST_SENSITIVE', '예민한 아티스트', '$$', 350000, 52),
    p('CORE_CONTROLLER', '코어 컨트롤러', '$$', 350000, 52),
    p('ROOKIE_LONGTERM', '장기 루키', '$', 180000, 104),
    p('VIRTUOSO_PREMIUM', '프리미엄 비르투오소', '$$$', 700000, 52, ['EQUIPMENT_DEMAND']),
    p('PRODUCER_RIGHTS', '프로듀서 권리', '$$$', 600000, 52, ['PRODUCER_RIGHTS']),
    p('TEAM_STABLE', '안정적 팀 플레이어', '$$', 300000, 52),
    p('PERSONAL_ACTIVITY', '개인 활동 보장', '$$', 320000, 52, ['PERSONAL_ACTIVITY']),
    p('EXPERIMENTAL_FREEDOM', '실험의 자유', '$$', 330000, 52),
    p('TOUR_PRO', '투어 프로', '$$', 340000, 52),
    p('FREE_SPIRIT', '자유로운 영혼', '$$', 300000, 26),
    p('TEAM_ENVIRONMENT', '팀 환경 중시', '$$', 320000, 52),
    p('AUTEUR_CONTROL', '오퇴르 컨트롤', '$$$', 900000, 52, ['CREATIVE_CONTROL']),
    p('VETERAN_STATUS', '베테랑 지위', '$$$', 650000, 52, ['VETERAN_STATUS']),
    p('ROOKIE_FLEXIBLE', '유연한 루키', '$', 170000, 52),
  ].map((c) => [c.id, c]),
);

export const CLAUSE_LABELS: Record<string, string> = {
  CREATIVE_CONTROL: 'Creative Control',
  PERSONAL_ACTIVITY: '개인 활동',
  EQUIPMENT_DEMAND: '장비 요구',
  VETERAN_STATUS: 'Veteran Status',
  PRODUCER_RIGHTS: 'Producer Rights',
};
