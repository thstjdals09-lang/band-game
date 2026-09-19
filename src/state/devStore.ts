// Developer diagnostics flag - completely separate from player-facing game state and from SaveData.
// When OFF (default, and always for a normal player) no asset key, TODO note or internal doc
// reference is rendered anywhere in the game UI. Toggled only from /dev.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface WorldDebugToggles {
  grid: boolean;
  coordinates: boolean;
  footprints: boolean;
  interactionTiles: boolean;
  depthAnchors: boolean;
  spawnPoints: boolean;
  safeArea: boolean;
}

export const DEFAULT_WORLD_TOGGLES: WorldDebugToggles = {
  grid: false, coordinates: false, footprints: false,
  interactionTiles: false, depthAnchors: false, spawnPoints: false, safeArea: false,
};

interface DevStore {
  diagnostics: boolean;
  setDiagnostics: (v: boolean) => void;
  toggleDiagnostics: () => void;
  /** Isometric world debug overlays. Only ever applied while diagnostics is on. */
  world: WorldDebugToggles;
  toggleWorldFlag: (key: keyof WorldDebugToggles) => void;
  setWorldFlags: (flags: Partial<WorldDebugToggles>) => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      diagnostics: false,
      setDiagnostics: (v) => set({ diagnostics: v }),
      toggleDiagnostics: () => set({ diagnostics: !get().diagnostics }),
      world: { ...DEFAULT_WORLD_TOGGLES },
      toggleWorldFlag: (key) => set({ world: { ...get().world, [key]: !get().world[key] } }),
      setWorldFlags: (flags) => set({ world: { ...get().world, ...flags } }),
    }),
    { name: 'band-game.dev', storage: createJSONStorage(() => localStorage) },
  ),
);

export const useDevDiagnostics = () => useDevStore((s) => s.diagnostics);
export const useWorldDebugFlags = () => useDevStore((s) => s.world);
