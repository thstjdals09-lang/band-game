// Developer diagnostics flag - completely separate from player-facing game state and from SaveData.
// When OFF (default, and always for a normal player) no asset key, TODO note or internal doc
// reference is rendered anywhere in the game UI. Toggled only from /dev.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_TEST_SPRITE, type TestSpriteParams } from '@/world/assets/testSprite';

export interface WorldDebugToggles {
  grid: boolean;
  coordinates: boolean;
  footprints: boolean;
  interactionTiles: boolean;
  depthAnchors: boolean;
  spawnPoints: boolean;
  safeArea: boolean;
  worldBounds: boolean;
}

export const DEFAULT_WORLD_TOGGLES: WorldDebugToggles = {
  grid: false, coordinates: false, footprints: false,
  interactionTiles: false, depthAnchors: false, spawnPoints: false, safeArea: false, worldBounds: false,
};

interface DevStore {
  /** /dev has been reached at least once: show the small DEV chip on the chrome layer. */
  devAccess: boolean;
  setDevAccess: (v: boolean) => void;
  unlockDev: () => void;
  diagnostics: boolean;
  setDiagnostics: (v: boolean) => void;
  toggleDiagnostics: () => void;
  /** Isometric world debug overlays. Only ever applied while diagnostics is on. */
  world: WorldDebugToggles;
  toggleWorldFlag: (key: keyof WorldDebugToggles) => void;
  setWorldFlags: (flags: Partial<WorldDebugToggles>) => void;
  /** WORLD VISUAL FIT TEST parameters. Development only - never part of SaveData. */
  testSprite: TestSpriteParams;
  setTestSprite: (patch: Partial<TestSpriteParams>) => void;
  resetTestSprite: () => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      devAccess: false,
      setDevAccess: (v) => set({ devAccess: v }),
      unlockDev: () => set({ devAccess: true }),
      diagnostics: false,
      setDiagnostics: (v) => set({ diagnostics: v }),
      toggleDiagnostics: () => set({ diagnostics: !get().diagnostics }),
      world: { ...DEFAULT_WORLD_TOGGLES },
      toggleWorldFlag: (key) => set({ world: { ...get().world, [key]: !get().world[key] } }),
      setWorldFlags: (flags) => set({ world: { ...get().world, ...flags } }),
      testSprite: { ...DEFAULT_TEST_SPRITE },
      setTestSprite: (patch) => set({ testSprite: { ...get().testSprite, ...patch } }),
      resetTestSprite: () => set({ testSprite: { ...DEFAULT_TEST_SPRITE } }),
    }),
    { name: 'band-game.dev', storage: createJSONStorage(() => localStorage) },
  ),
);

export const useDevDiagnostics = () => useDevStore((s) => s.diagnostics);
export const useWorldDebugFlags = () => useDevStore((s) => s.world);
export const useTestSprite = () => useDevStore((s) => s.testSprite);
