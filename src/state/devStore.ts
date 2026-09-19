// Developer diagnostics flag - completely separate from player-facing game state and from SaveData.
// When OFF (default, and always for a normal player) no asset key, TODO note or internal doc
// reference is rendered anywhere in the game UI. Toggled only from /dev.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DevStore {
  diagnostics: boolean;
  setDiagnostics: (v: boolean) => void;
  toggleDiagnostics: () => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      diagnostics: false,
      setDiagnostics: (v) => set({ diagnostics: v }),
      toggleDiagnostics: () => set({ diagnostics: !get().diagnostics }),
    }),
    { name: 'band-game.dev', storage: createJSONStorage(() => localStorage) },
  ),
);

export const useDevDiagnostics = () => useDevStore((s) => s.diagnostics);
