import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LevelResult } from '@/types/game';

interface GameState {
  /** Highest level id (1-40) the player has unlocked. */
  unlockedLevelId: number;
  /** Best result recorded per level id. */
  bestResults: Record<number, LevelResult>;
  completeLevel: (result: LevelResult) => void;
  resetProgress: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      unlockedLevelId: 1,
      bestResults: {},
      completeLevel: (result) =>
        set((state) => {
          const previousBest = state.bestResults[result.levelId];
          const isNewBest = !previousBest || result.wpm > previousBest.wpm;
          return {
            bestResults: isNewBest
              ? { ...state.bestResults, [result.levelId]: result }
              : state.bestResults,
            unlockedLevelId:
              result.passed && result.levelId >= state.unlockedLevelId
                ? Math.min(result.levelId + 1, 40)
                : state.unlockedLevelId,
          };
        }),
      resetProgress: () => set({ unlockedLevelId: 1, bestResults: {} }),
    }),
    { name: 'mecanografia-progress' }
  )
);
