// Song creation (GDD v0.2 §06).
//
// "곡은 멤버 능력 + 성격/특성 + 음악 성향 + 관계 + 최근 사건 + 컨디션/경험의 결과로 생성된다."
//
// Implemented inputs: 멤버 능력, 특성, 음악 성향(Music DNA + 역할), 컨디션/경험, 제작 상황.
// NOT implemented: 관계 / 최근 사건 -> PHASE 2B. They enter through `relationshipContribution`,
// which returns a documented ZERO today instead of a made-up number.

import {
  CHARACTERS, PROTOTYPE_BALANCE, type CharacterId, type MainActionId, type MusicDNA,
} from '@/data/master';
import { isReleased } from '../save/schema';
import type { SaveData, SongState } from '../save/schema';
import { bandDna, dnaSimilarity, genreTagsFor, songDna, type BandDna } from './musicDna';
import type { Rng } from './rng';

/**
 * PHASE 2B connection point. Relationship tension and recent events are part of the documented
 * song formula but their data does not exist yet, so this contributes nothing and is not faked.
 */
function relationshipContribution(): { popularity: number; artistry: number; fanFit: number; liveFit: number } {
  return { popularity: 0, artistry: 0, fanFit: 0, liveFit: 0 };
}

const clamp100 = (v: number) => Math.max(1, Math.min(100, Math.round(v)));

export interface SongCreationContext {
  save: SaveData;
  /** Which creative activity produced it. */
  origin: MainActionId;
  week: number;
  rng: Rng;
}

export interface CreatedSong {
  song: Omit<SongState, 'id'>;
  composerId?: CharacterId;
  lyricistId?: CharacterId;
}

/** Who wrote it: the strongest composer / lyricist currently in the band, condition weighted. */
function pickContributors(save: SaveData) {
  const members = save.band.activeMembers;
  if (members.length === 0) return { composerId: undefined, lyricistId: undefined };
  const score = (id: CharacterId, key: 'composing' | 'lyrics') => {
    const c = CHARACTERS[id];
    const cond = save.characterStates[id]?.condition;
    const fatigue = cond ? (cond.energy / 100) * 0.35 + 0.65 : 1;
    return c.hiddenStats[key] * fatigue + c.visibleStats.creative * 0.35;
  };
  const byComposing = [...members].sort((a, b) => score(b, 'composing') - score(a, 'composing'));
  const byLyrics = [...members].sort((a, b) => score(b, 'lyrics') - score(a, 'lyrics'));
  return { composerId: byComposing[0], lyricistId: byLyrics[0] };
}

/** Average condition of the writing members, 0..1. */
function writingCondition(save: SaveData, ids: (CharacterId | undefined)[]): number {
  const present = ids.filter(Boolean) as CharacterId[];
  if (present.length === 0) return 0.7;
  const total = present.reduce((acc, id) => {
    const c = save.characterStates[id]?.condition;
    if (!c) return acc + 0.7;
    return acc + (c.energy * 0.5 + c.morale * 0.35 + (100 - c.stress) * 0.15) / 100;
  }, 0);
  return total / present.length;
}

/** Fan taste = the DNA of what has already been released. Nothing released yet = no bias. */
function fanTasteDna(save: SaveData): MusicDNA | null {
  const released = Object.values(save.songs).filter((s) => isReleased(s.status) && s.musicDna);
  if (released.length === 0) return null;
  const axes: (keyof MusicDNA)[] = ['accessibility', 'texture', 'energy', 'focus', 'tone'];
  const out = { accessibility: 0, texture: 0, energy: 0, focus: 0, tone: 0 } as MusicDNA;
  axes.forEach((a) => {
    out[a] = released.reduce((acc, s) => acc + (s.musicDna as MusicDNA)[a], 0) / released.length;
  });
  return out;
}

// Provisional title vocabulary. GDD §06 requires titles to derive from the lyricist and the
// situation; the actual word list is VS content and will be replaced.
// TODO(VS content): replace with authored lines per character.
const TITLE_BY_TONE: Record<'dark' | 'bright', string[]> = {
  dark: ['Basement Light', 'After Hours', 'Concrete Heart', 'Cold Amp', 'Last Train', 'Smoke and Static'],
  bright: ['Sunday Practice', 'Paper Plane', 'First Take', 'Bright Noise', 'Open Window', 'Morning Set'],
};
const TITLE_BY_ENERGY: Record<'calm' | 'loud', string[]> = {
  calm: ['Slow Fade', 'Quiet Room', 'Long Way Home', 'Blue Hour'],
  loud: ['Feedback', 'Run It Back', 'Broken String', 'Loud Enough', 'Kick the Door'],
};

function composeTitle(dna: MusicDNA, origin: MainActionId, rng: Rng, taken: Set<string>): string {
  const pool = [
    ...(dna.tone < 0 ? TITLE_BY_TONE.dark : TITLE_BY_TONE.bright),
    ...(dna.energy > 20 ? TITLE_BY_ENERGY.loud : TITLE_BY_ENERGY.calm),
  ];
  // A band does not write the same song title twice: try the unused names first.
  const fresh = pool.filter((t) => !taken.has(t));
  const base = rng.pick(fresh.length > 0 ? fresh : pool);
  if (!taken.has(base)) return origin === 'RECORDING' && rng.chance(0.3) ? `${base} (Take 2)` : base;
  for (let take = 2; take < 40; take += 1) {
    const candidate = `${base} (Take ${take})`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
}

function originContextFor(origin: MainActionId, composerId?: CharacterId): string[] {
  const out: string[] = [origin === 'RECORDING' ? 'RECORDING_SESSION' : 'BAND_PRACTICE'];
  // Character Master gives C02 the hidden MIDNIGHT_COMPOSER trait; hidden traits shape the
  // simulation even before the player discovers them.
  if (composerId && CHARACTERS[composerId].hiddenTraitIds.includes('MIDNIGHT_COMPOSER')) {
    out.push('LATE_NIGHT_SESSION');
  }
  return out;
}

/** GDD §06 곡 평가 4축. */
export function createSong(ctx: SongCreationContext): CreatedSong | null {
  const { save, origin, week, rng } = ctx;
  const dnaBand: BandDna | null = bandDna(save);
  if (!dnaBand) return null;

  const { composerId, lyricistId } = pickContributors(save);
  const dna = songDna(dnaBand, composerId);
  const condition = writingCondition(save, [composerId, lyricistId]);
  const rel = relationshipContribution();

  const members = save.band.activeMembers;
  const avg = (fn: (id: CharacterId) => number) =>
    members.length ? members.reduce((a, id) => a + fn(id), 0) / members.length : 50;

  const composer = composerId ? CHARACTERS[composerId] : null;
  const lyricist = lyricistId ? CHARACTERS[lyricistId] : null;

  // 대중성: 음원·차트·바이럴 등 대중 반응 가능성.
  const popularity =
    50
    + dna.accessibility * 0.28
    + (avg((id) => CHARACTERS[id].visibleStats.star) - 60) * 0.35
    + ((composer?.hiddenStats.composing ?? 60) - 60) * 0.18
    + (composer?.hiddenTraitIds.includes('HIT_FORMULA') ? 8 : 0)
    + condition * 10 - 7
    + rel.popularity
    + rng.spread(4);

  // 음악성: 평론·업계 평가와 장기적 작품 가치. 실험성과 정제된 질감이 함께 작용한다.
  const experimentalPull = Math.abs(Math.min(0, dna.accessibility)) * 0.16;
  const artistry =
    48
    + (avg((id) => CHARACTERS[id].visibleStats.creative) - 60) * 0.4
    + ((composer?.hiddenStats.composing ?? 60) - 60) * 0.22
    + ((lyricist?.hiddenStats.lyrics ?? 60) - 60) * 0.16
    + dna.texture * 0.12
    + experimentalPull
    + (origin === 'RECORDING' ? 5 : 0)
    + dnaBand.cohesion * 6
    + rel.artistry
    + rng.spread(4);

  // 팬덤 적합도: 현재 코어팬 취향과의 일치도. 발매한 곡이 없으면 팬 취향도 아직 없다.
  const taste = fanTasteDna(save);
  const fanFit = taste
    ? 30 + dnaSimilarity(dna, taste) * 70 + rel.fanFit + rng.spread(3)
    : 46 + dnaBand.cohesion * 12 + rel.fanFit + rng.spread(4);

  // 라이브 적합도: 공연장에서의 폭발력과 관객 반응.
  const liveFit =
    46
    + (avg((id) => CHARACTERS[id].visibleStats.stage) - 60) * 0.42
    + dna.energy * 0.22
    + (avg((id) => CHARACTERS[id].hiddenStats.liveStability) - 60) * 0.16
    + rel.liveFit
    + rng.spread(4);

  const genreTags = genreTagsFor(dna, members);

  return {
    composerId,
    lyricistId,
    song: {
      title: composeTitle(dna, origin, rng, new Set(Object.values(save.songs).map((x) => x.title))),
      createdWeek: week,
      contributors: { composer: composerId ? [composerId] : [], lyrics: lyricistId ? [lyricistId] : [] },
      originContext: originContextFor(origin, composerId),
      musicProfile: {
        popularity: clamp100(popularity),
        artistry: clamp100(artistry),
        fanFit: clamp100(fanFit),
        liveFit: clamp100(liveFit),
      },
      musicDna: dna,
      genreTags,
      status: 'UNRELEASED',
    },
  };
}

/** Whether a creative week produces a song at all (GDD: 곡은 활동의 결과로 태어난다). */
// v1: a demo is written only when the band booked new-song work and spent a rehearsal slot on it.
// The trigger now lives in the week engine (plan.songWork), so no activity creates a song by itself.

export const SONG_BALANCE = PROTOTYPE_BALANCE.release;
