// Band Music DNA (Character Master v1.1 §05).
//
// "밴드 Music DNA는 단순 평균이 아니다. 평균 + 분산 + 극단값 + 역할 영향도(예: Producer)를 함께
//  계산한다. 따라서 같은 네 명이라도 역할 배치가 달라지면 음악적 결과가 달라질 수 있다."
//
// Only the four inputs the doc names are used here. Relationship history is a PHASE 2B input and
// is deliberately absent rather than faked.

import { CHARACTERS, SLOT_DEFINITIONS, type CharacterId, type MusicDNA, type SlotId } from '@/data/master';
import type { SaveData } from '../save/schema';

export const DNA_AXES: (keyof MusicDNA)[] = ['accessibility', 'texture', 'energy', 'focus', 'tone'];

export interface BandDna {
  /** Weighted mean of each axis. */
  mean: MusicDNA;
  /** Spread per axis - how much the members disagree. */
  variance: MusicDNA;
  /** Strongest single opinion per axis (largest |value|). */
  extreme: MusicDNA;
  /** 0..1, how unified the band sounds (low variance = high). */
  cohesion: number;
  /** Contributing members, after role weighting. */
  contributors: { characterId: CharacterId; weight: number; slot: SlotId | null }[];
}

/**
 * Role influence: who shapes the sound.
 * A Producer / Keys seat steers the record, a vocalist fronts it, the rhythm section anchors it.
 * TODO(balance): the weights themselves are not given in the documents.
 */
function roleWeight(id: CharacterId, slot: SlotId | null): number {
  const def = CHARACTERS[id];
  let w = 1;
  if (def.positions.includes('Producer')) w += 0.8;
  if (slot === 'KEYS') w += 0.3;
  if (slot === 'VOCAL') w += 0.35;
  if (slot === 'GUITAR') w += 0.15;
  // Creative members pull the sound their way.
  w += (def.visibleStats.creative - 60) / 200;
  return Math.max(0.3, w);
}

const zeroDna = (): MusicDNA => ({ accessibility: 0, texture: 0, energy: 0, focus: 0, tone: 0 });

/** Members currently in the lineup carry the sound; bench members do not. */
export function bandDna(save: SaveData): BandDna | null {
  const contributors: BandDna['contributors'] = [];
  save.band.lineup.forEach((s) => {
    if (s.assignment?.kind !== 'MEMBER') return;
    const id = s.assignment.characterId;
    contributors.push({ characterId: id, weight: roleWeight(id, s.slotId), slot: s.slotId });
  });
  // A member on the bench still writes, but with much less pull.
  const assigned = new Set(contributors.map((c) => c.characterId));
  save.band.activeMembers.filter((id) => !assigned.has(id)).forEach((id) => {
    contributors.push({ characterId: id, weight: 0.35, slot: null });
  });
  if (contributors.length === 0) return null;

  const totalWeight = contributors.reduce((a, c) => a + c.weight, 0);
  const mean = zeroDna();
  const variance = zeroDna();
  const extreme = zeroDna();

  DNA_AXES.forEach((axis) => {
    let m = 0;
    contributors.forEach((c) => { m += CHARACTERS[c.characterId].musicDNA[axis] * c.weight; });
    m /= totalWeight;
    mean[axis] = m;

    let v = 0;
    contributors.forEach((c) => {
      const d = CHARACTERS[c.characterId].musicDNA[axis] - m;
      v += d * d * c.weight;
    });
    variance[axis] = Math.sqrt(v / totalWeight);

    let best = 0;
    contributors.forEach((c) => {
      const val = CHARACTERS[c.characterId].musicDNA[axis];
      if (Math.abs(val) > Math.abs(best)) best = val;
    });
    extreme[axis] = best;
  });

  const avgVariance = DNA_AXES.reduce((a, axis) => a + variance[axis], 0) / DNA_AXES.length;
  const cohesion = Math.max(0, Math.min(1, 1 - avgVariance / 100));

  return { mean, variance, extreme, cohesion, contributors };
}

/**
 * The DNA of one song: the band's mean pulled toward whoever drove this particular session,
 * so the same members writing in a different role setup produce a different song.
 */
export function songDna(band: BandDna, composerId: CharacterId | undefined, pullToComposer = 0.35): MusicDNA {
  const out = zeroDna();
  const composer = composerId ? CHARACTERS[composerId].musicDNA : null;
  DNA_AXES.forEach((axis) => {
    const base = band.mean[axis];
    const pulled = composer ? base + (composer[axis] - base) * pullToComposer : base;
    // An unusually strong single opinion leaves a mark even when the average is mild.
    const extremePull = (band.extreme[axis] - pulled) * 0.12;
    out[axis] = Math.max(-100, Math.min(100, pulled + extremePull));
  });
  return out;
}

/** 0..1 similarity between two DNA vectors (1 = identical). */
export function dnaSimilarity(a: MusicDNA, b: MusicDNA): number {
  const dist = Math.sqrt(DNA_AXES.reduce((acc, axis) => acc + (a[axis] - b[axis]) ** 2, 0));
  const maxDist = Math.sqrt(DNA_AXES.length * 200 * 200);
  return Math.max(0, 1 - dist / maxDist);
}

/** Genre tags the band's DNA currently points at, used for song tagging. */
export function genreTagsFor(dna: MusicDNA, contributors: CharacterId[]): string[] {
  const pool = new Map<string, number>();
  contributors.forEach((id) => {
    const c = CHARACTERS[id];
    const closeness = dnaSimilarity(c.musicDNA, dna);
    c.musicTags.forEach((t) => pool.set(t, (pool.get(t) ?? 0) + closeness));
  });
  return [...pool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
}

/** Slot label for display in the lab / member screens. */
export function slotLabel(slot: SlotId): string {
  return SLOT_DEFINITIONS[slot]?.label ?? slot;
}
