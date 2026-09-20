import type { SaveData } from '@/state/save/schema';

export function won(n: number): string {
  return `₩${Math.round(n).toLocaleString('ko-KR')}`;
}

/**
 * 얇은 HUD용 자금 표기 (300만 / 58만 / 8,000).
 * 옆에 '자금' 라벨이 붙어 있어 통화 기호 없이도 뜻이 통하고,
 * ₩ 글리프가 작은 고정폭 글꼴에서 숫자와 뭉개지던 문제도 사라진다.
 * 상세 화면의 정확한 금액은 won()을 그대로 쓴다.
 */
export function wonShort(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 10_000) return `${Math.round(v / 10_000).toLocaleString('ko-KR')}만`;
  return v.toLocaleString('ko-KR');
}

export function weekLabel(save: SaveData): string {
  return `Y${save.world.year} W${String(save.world.week).padStart(2, '0')}`;
}

export function yearWeekLong(save: SaveData): string {
  return `${save.world.year}년차 · ${save.world.week}주차`;
}

export function expiresIn(save: SaveData, expiresWeek: number): string {
  const d = expiresWeek - save.world.week;
  if (d <= 0) return '이번 주 마감';
  if (d === 1) return '다음 주 마감';
  return `${d}주 후 마감`;
}

/** Korean subject particle 이/가 for a name ending in a consonant / vowel. */
export function subjectParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return '이';
  return (last - 0xac00) % 28 === 0 ? '가' : '이';
}

/** Korean topic particle 은/는. */
export function topicParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return '은';
  return (last - 0xac00) % 28 === 0 ? '는' : '은';
}
