import type { SaveData } from '@/state/save/schema';

export function won(n: number): string {
  return `₩${Math.round(n).toLocaleString('ko-KR')}`;
}

export function weekLabel(save: SaveData): string {
  return `Y${save.world.year} W${String(save.world.week).padStart(2, '0')}`;
}

export function yearWeekLong(save: SaveData): string {
  return `YEAR ${save.world.year} · WEEK ${String(save.world.week).padStart(2, '0')}`;
}

export function expiresIn(save: SaveData, expiresWeek: number): string {
  const d = expiresWeek - save.world.week;
  if (d <= 0) return 'Expires this week';
  if (d === 1) return 'Expires next week';
  return `Expires in ${d} weeks`;
}
