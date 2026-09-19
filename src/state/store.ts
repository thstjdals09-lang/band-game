// Single game store. Persisted to localStorage (GDD §10: Vertical Slice = LocalStorage / IndexedDB).
// Only `save` is persisted. UI-only state lives in components / URL search params.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createNewGame } from './save/newGame';
import { migrateSave } from './save/migrate';
import type { SaveData } from './save/schema';

export const SAVE_STORAGE_KEY = 'band-game.save.v1';

export interface GameStore {
  save: SaveData | null;
  newGame: (producerName: string) => void;
  resetSave: () => void;
  /** Apply a mutation on a cloned save and commit it (prototype-simple immutability). */
  update: (mutator: (draft: SaveData) => void) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      save: null,
      newGame: (producerName) => set({ save: createNewGame(producerName) }),
      resetSave: () => set({ save: null }),
      update: (mutator) => {
        const current = get().save;
        if (!current) return;
        const draft = structuredClone(current);
        mutator(draft);
        set({ save: draft });
      },
    }),
    {
      name: SAVE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ save: s.save }),
      version: 1,
      // Every load passes through migrateSave (version step-ups + same-version ensureSaveDefaults fallback).
      merge: (persisted, current) => {
        const p = persisted as { save?: SaveData | null } | undefined;
        let save: SaveData | null = null;
        try { save = p?.save ? migrateSave(p.save) : null; } catch (e) { console.error('[save] unreadable save discarded', e); }
        return { ...current, save };
      },
      migrate: (persisted) => persisted as { save: SaveData | null },
    },
  ),
);

/** Convenience: current save or throw (screens are only mounted when a save exists). */
export function useSave(): SaveData {
  const save = useGameStore((s) => s.save);
  if (!save) throw new Error('No save loaded');
  return save;
}
