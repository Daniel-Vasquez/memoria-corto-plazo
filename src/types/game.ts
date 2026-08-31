export type Tier = 'basico' | 'medio' | 'avanzado' | 'master';

export interface TierMeta {
  id: Tier;
  label: string;
  description: string;
  colorClass: string; // tailwind text/accent color for this tier
}

export interface Level {
  /** Global id, 1-40 */
  id: number;
  tier: Tier;
  /** Position within the tier, 1-10 */
  subLevel: number;
  title: string;
  instructions: string;
  /** Minimum words-per-minute required to pass */
  minWpm: number;
  /** Minimum accuracy percentage (0-100) required to pass */
  minAccuracy: number;
}

export interface LevelResult {
  levelId: number;
  wpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  passed: boolean;
}

/** Resultado de comparar, carácter a carácter, lo escrito de memoria contra el texto original. */
export type CharState = 'correct' | 'incorrect';

/** Subconjunto de GameState que se sincroniza con MongoDB vía /api/progress. */
export interface ProgressSnapshot {
  playerName: string | null;
  unlockedLevelId: number;
  bestResults: Record<number, LevelResult>;
}
