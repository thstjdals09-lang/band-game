// Seeded RNG with per-system streams (Character Master v1.1 §14).
// Separate streams stop an audition change from shifting performance results, and make a week
// reproducible: the same save + stream position always yields the same outcome.

export type RngStreamId = 'audition' | 'events' | 'performance' | 'world';

/** mulberry32 - small, fast, deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** 0 <= n < 1 */
  next: () => number;
  /** min <= n <= max */
  range: (min: number, max: number) => number;
  /** Symmetric jitter around zero. */
  spread: (amount: number) => number;
  pick: <T>(items: T[]) => T;
  chance: (p: number) => boolean;
}

const hashStream = (stream: RngStreamId): number => {
  let h = 2166136261;
  for (let i = 0; i < stream.length; i += 1) {
    h ^= stream.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Build a deterministic generator from the save seed, a stream name and its position. */
export function createRng(baseSeed: number, stream: RngStreamId, position: number): Rng {
  const next = mulberry32((baseSeed ^ hashStream(stream)) + position * 0x9e3779b9);
  const range = (min: number, max: number) => min + next() * (max - min);
  return {
    next,
    range,
    spread: (amount) => range(-amount, amount),
    pick: (items) => items[Math.min(items.length - 1, Math.floor(next() * items.length))],
    chance: (p) => next() < p,
  };
}
