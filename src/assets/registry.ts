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
