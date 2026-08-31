import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pushProgress } from '@/lib/progressSync';
import type { LevelResult, ProgressSnapshot } from '@/types/game';

interface GameState {
  /** Name entered on first visit; null until the player sets it. */
  playerName: string | null;
  /** Highest level id (1-40) the player has unlocked. */
  unlockedLevelId: number;
  /** Id del último nivel seleccionado, para reabrir ahí al recargar la página. */
  activeLevelId: number;
  /** Best result recorded per level id. */
  bestResults: Record<number, LevelResult>;
  setPlayerName: (name: string) => void;
  setActiveLevelId: (levelId: number) => void;
  completeLevel: (result: LevelResult) => void;
  resetProgress: () => void;
  /** Aplica un snapshot ya mezclado con Mongo (ver progressSync.ts) — no dispara
   * pushProgress porque viene de sincronizar, no de una acción nueva del jugador. */
  applyProgress: (snapshot: ProgressSnapshot) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      playerName: null,
      unlockedLevelId: 1,
      activeLevelId: 1,
      bestResults: {},
      setPlayerName: (name) => set({ playerName: name.trim() }),
      setActiveLevelId: (levelId) => set({ activeLevelId: levelId }),
      completeLevel: (result) =>
        set((state) => {
          const previousBest = state.bestResults[result.levelId];
          const isNewBest = !previousBest || result.wpm > previousBest.wpm;
          const bestResults = isNewBest
            ? { ...state.bestResults, [result.levelId]: result }
            : state.bestResults;
          const unlockedLevelId =
            result.passed && result.levelId >= state.unlockedLevelId
              ? Math.min(result.levelId + 1, 40)
              : state.unlockedLevelId;
          void pushProgress({ unlockedLevelId, bestResults });
          return { bestResults, unlockedLevelId };
        }),
      resetProgress: () => {
        void pushProgress({ unlockedLevelId: 1, bestResults: {} });
        set({ unlockedLevelId: 1, activeLevelId: 1, bestResults: {} });
      },
      applyProgress: (snapshot) =>
        set({ unlockedLevelId: snapshot.unlockedLevelId, bestResults: snapshot.bestResults }),
    }),
    { name: 'memoria-corto-plazo-progress' },
  ),
);
