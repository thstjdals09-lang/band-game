// World layer contract. The UI (React) never draws the world itself; it hands a WorldScene to a
// WorldView implementation. `DomWorldView` is the placeholder renderer used now; a Phaser-based
// isometric renderer can implement the same props later without touching screens (GDD §11).
export type WorldMode = 'home' | 'build';

export interface WorldActor {
  id: string;             // CharacterId or session instanceId
  kind: 'character' | 'session';
  label: string;
  assetKey: string;       // CHARACTER_C01_FULL / SESSION_MUSICIAN_FULL
  x: number;              // normalized 0..1 (PROTOTYPE VARIABLE - tile coords come with the iso renderer)
  y: number;
  activity: 'idle' | 'practice' | 'rest' | 'note' | 'phone';
  badge?: string;         // event marker text ("!", "NEW")
}

export type HotspotKind = 'inbox' | 'board' | 'exit' | 'facility';

export interface WorldHotspot {
  id: string;
  kind: HotspotKind;
  label: string;
  assetKey: string;
  x: number;
  y: number;
  state?: 'BUILT' | 'AVAILABLE' | 'LOCKED';
  /** Player-facing state word (never an internal enum shown raw). */
  stateLabel?: string;
  badge?: string;         // short player-facing marker, e.g. "3"
  target: string;         // route path
}

export interface WorldScene {
  mode: WorldMode;
  stage: number;          // basecamp visual stage (1 -> 2 after RECORDING_ROOM build)
  backgroundKey: string;
  actors: WorldActor[];
  hotspots: WorldHotspot[];
}

export interface WorldViewProps {
  scene: WorldScene;
  onSelectActor?: (actor: WorldActor) => void;
  onSelectHotspot?: (hotspot: WorldHotspot) => void;
}
