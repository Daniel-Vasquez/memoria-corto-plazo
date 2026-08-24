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
  /** Pool of texts the engine can pick from for this subnivel */
  texts: string[];
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

export type CharState = 'pending' | 'correct' | 'incorrect' | 'current';
