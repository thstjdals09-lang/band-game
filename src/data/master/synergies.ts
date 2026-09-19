// Special Pair Chemistry - Character Master v1.1 §06.
import type { SynergyDefinition } from './types';

export const SYNERGIES: Record<string, SynergyDefinition> = {
  HIT_MACHINE: { id: 'HIT_MACHINE', name: 'Hit Machine', pair: ['C01', 'C06'], effect: '스타성 + 히트메이킹. 대중성 높은 싱글에 강함.' },
  AFTER_MIDNIGHT: { id: 'AFTER_MIDNIGHT', name: 'After Midnight', pair: ['C02', 'C09'], effect: '음악성과 실험성이 높아지며 분위기형 곡에 특화.' },
  CONTROLLED_EXPLOSION: { id: 'CONTROLLED_EXPLOSION', name: 'Controlled Explosion', pair: ['C05', 'C11'], effect: '라이브 Peak 상승 / 사고 위험도 상승.' },
  TWO_CAPTAINS: { id: 'TWO_CAPTAINS', name: 'Two Captains', pair: ['C03', 'C13'], effect: '창작력 상승 / 주도권 갈등 크게 상승.' },
  BRIDGE: { id: 'BRIDGE', name: 'Bridge', pair: ['C07', 'C09'], effect: '류건의 장르 충돌 페널티 완화.' },
  ANCHOR: { id: 'ANCHOR', name: 'Anchor', pair: ['C12', 'C11'], effect: '아린의 사고 확률 감소 / Peak 소폭 감소.' },
  DOUBLE_SPOTLIGHT: { id: 'DOUBLE_SPOTLIGHT', name: 'Double Spotlight', pair: ['C08', 'C01'], effect: '팬 증가 상승 / 인기 경쟁 위험.' },
  STUDENT_AND_MONSTER: { id: 'STUDENT_AND_MONSTER', name: 'Student & Monster', pair: ['C04', 'C05'], effect: '조건 충족 시 채린 성장 가속.' },
};
