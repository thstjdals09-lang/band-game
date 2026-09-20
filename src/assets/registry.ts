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
  // C01_FULL.png -> CHARACTER_C01_FULL
  // C01_POSE_1_FULL.png -> CHARACTER_C01_POSE_1_FULL  (자세 그림)
  const match = /\/(C\d{2})_((?:POSE_[A-Za-z0-9]+_)?(?:FULL|SIT|BUST|THUMB))\.png$/.exec(path);
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

/**
 * 자세 그림의 키 규칙: `CHARACTER_<ID>_POSE_<이름>_FULL`.
 * 파일을 그 이름으로 characters/ 에 넣으면 위의 glob이 자동으로 등록한다.
 * (자세 그림은 액션 시트에서 잘라 넣을 예정이라 지금은 비어 있다.)
 */
export function characterPoseAssetKey(id: string, pose?: string): AssetKey {
  if (pose) {
    const key = characterPoseKey(id, pose);
    if (key) return key;
  }
  return `CHARACTER_${id}_FULL`;
}

/** 이 인물에게 실제로 그림이 있는 자세 이름들. 그림이 없으면 빈 배열이다. */
export function characterPoses(id: string): string[] {
  const prefix = `CHARACTER_${id}_POSE_`;
  const found = new Set<string>();
  for (const k of Object.keys(assetRegistry)) {
    if (!k.startsWith(prefix) || !assetRegistry[k]) continue;
    // CHARACTER_C01_POSE_4_SIT -> '4' (끝 토큰은 자세 등급이라 버튼 이름이 아니다)
    const rest = k.slice(prefix.length);
    const cut = rest.lastIndexOf('_');
    if (cut > 0) found.add(rest.slice(0, cut));
  }
  return [...found].sort();
}

/** 이 인물의 이 자세 그림 키. 등급(FULL/SIT…)은 파일이 정하므로 둘 다 찾아본다. */
export function characterPoseKey(id: string, pose: string): AssetKey | undefined {
  const prefix = `CHARACTER_${id}_POSE_${pose}_`;
  return Object.keys(assetRegistry).find((k) => k.startsWith(prefix) && assetRegistry[k]);
}

/**
 * 자세 자리. 지금은 그림이 없어 비어 있고, 파일을 넣으면 그 자리가 켜진다.
 * 파일 이름: `src/assets/characters/<ID>_POSE_<이름>_FULL.png` (예: C01_POSE_1_FULL.png)
 */
export const POSE_SLOTS = ['1', '2', '3', '4'] as const;

export function characterPoseSlots(id: string): { name: string; label: string; ready: boolean }[] {
  const ready = new Set(characterPoses(id));
  const extra = [...ready].filter((n) => !POSE_SLOTS.includes(n as typeof POSE_SLOTS[number]));
  return [...POSE_SLOTS, ...extra].map((name) => ({
    name,
    label: /^\d+$/.test(name) ? `자세${name}` : name,
    ready: ready.has(name),
  }));
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
