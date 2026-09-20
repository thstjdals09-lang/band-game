// Visual asset registry.
// Every visual the game needs is addressed by a stable key. A key with `null` renders an explicit
// [PLACEHOLDER_<KEY>] box (see components/PlaceholderAsset). To plug real art in, set the URL here -
// no screen code changes required.
//
// Visual Bible v1.0: full-body HD pixel character = Source of Truth; Bust/Portrait/Thumbnail are DERIVED from it
// (never separately illustrated). Keys keep that derivation explicit: character_C01_full -> _bust -> _thumb.

export type AssetKey = string;

export const assetRegistry: Record<AssetKey, string | null> = {
  // Environment (isometric world)
  BASECAMP_BG_STAGE1: null,
  BASECAMP_BG_STAGE2: null,
  AUDITION_ROOM_BG: null,
  PERFORMANCE_STAGE_BASEMENT_CLUB: null,
  PERFORMANCE_STAGE_MOONLIGHT_CLUB: null,
  PERFORMANCE_CROWD: null,
  OUTSIDE_MAP: null,
  // Basecamp objects (hotspots)
  OBJ_PHONE_DESK: null,
  OBJ_NOTICE_BOARD: null,
  OBJ_EXIT_DOOR: null,
  OBJ_RECORDING_ROOM_DOOR_LOCKED: null,
  OBJ_RECORDING_ROOM_BUILT: null,
  // Generic session musician
  SESSION_MUSICIAN_FULL: null,
  SESSION_MUSICIAN_THUMB: null,
  // UI
  TITLE_ART: null,
  ICON_DOCK_BAND: null,
  ICON_DOCK_SCHEDULE: null,
  ICON_DOCK_AUDITION: null,
  ICON_DOCK_MANAGEMENT: null,
  ICON_DOCK_OUTSIDE: null,
  AUDIO_PREVIEW_PLAYER: null,
  DISPLAY_FONT_BRUSH: null,
};

const CHARACTER_IDS = ['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15'] as const;
for (const id of CHARACTER_IDS) {
  assetRegistry[`CHARACTER_${id}_FULL`] = null;
  assetRegistry[`CHARACTER_${id}_BUST`] = null;
  assetRegistry[`CHARACTER_${id}_THUMB`] = null;
}

// Approved character art. `characters/<ID>_<VARIANT>.png` files are derived from the approved
// MASTER turnaround sheets in assets_source/ (front view only; BUST and THUMB are crops of FULL,
// never separately illustrated). Dropping a file in that folder registers it - no code change.
const characterArt = import.meta.glob('./characters/*.png', { eager: true, import: 'default' }) as Record<string, string>;
for (const [path, url] of Object.entries(characterArt)) {
  const match = /\/(C\d{2})_(FULL|BUST|THUMB)\.png$/.exec(path);
  if (match) assetRegistry[`CHARACTER_${match[1]}_${match[2]}`] = url;
}

// 세션 연주자 임시 이미지. `sessions/SESSION_<NN>_<VARIANT>.png` 를 파일명 그대로 키로 등록한다.
// 아직 인물별 지정 이미지가 없어서, 준비된 이미지를 세션 자리에 나눠 쓴다.
const sessionArt = import.meta.glob('./sessions/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const sessionArtIds = new Set<string>();
for (const [path, url] of Object.entries(sessionArt)) {
  const match = /\/(SESSION_\d{2})_(FULL|THUMB)\.png$/.exec(path);
  if (!match) continue;
  assetRegistry[`${match[1]}_${match[2]}`] = url;
  sessionArtIds.add(match[1]);
}
/** 등록된 세션 이미지 id 목록 (SESSION_01 ...). 파일을 넣고 빼면 그대로 따라간다. */
export const SESSION_ART_IDS: string[] = [...sessionArtIds].sort();

/**
 * 특정 세션에 고정할 이미지. 나중에 인물별 지정 이미지가 생기면 여기에 한 줄씩 적으면 된다.
 * 키는 아래 sessionAssetKey에 넘기는 seed(세션 instanceId나 템플릿 id), 값은 SESSION_ART_IDS의 id다.
 * 예: { session_00042: 'SESSION_07', SESSION_KEYS_A: 'SESSION_12' }
 */
export const SESSION_ART_BY_SEED: Record<string, string> = {};

/**
 * 세션 자리에 쓸 이미지 키. 같은 seed는 항상 같은 얼굴로 보인다(저장하지 않는다).
 * 지정 이미지가 있으면 그것이 우선하고, 준비된 이미지가 하나도 없으면 기존 중립 키로 돌아간다.
 */
export function sessionAssetKey(seed?: string | number, variant: 'FULL' | 'THUMB' = 'THUMB'): AssetKey {
  const fallback = variant === 'THUMB' ? 'SESSION_MUSICIAN_THUMB' : 'SESSION_MUSICIAN_FULL';
  if (SESSION_ART_IDS.length === 0) return fallback;
  const key = String(seed ?? '');
  const pinned = SESSION_ART_BY_SEED[key];
  if (pinned && sessionArtIds.has(pinned)) return `${pinned}_${variant}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${SESSION_ART_IDS[Math.abs(hash) % SESSION_ART_IDS.length]}_${variant}`;
}

export function characterAssetKey(id: string, variant: 'FULL' | 'BUST' | 'THUMB' = 'FULL'): AssetKey {
  return `CHARACTER_${id}_${variant}`;
}

/** Register asset keys declared elsewhere (world tiles / object state variants). */
export function ensureAssetKeys(keys: AssetKey[]): void {
  keys.forEach((k) => { if (!(k in assetRegistry)) assetRegistry[k] = null; });
}

export function resolveAsset(key: AssetKey): string | null {
  return assetRegistry[key] ?? null;
}

export function placeholderLabel(key: AssetKey): string {
  return `[PLACEHOLDER_${key}]`;
}
