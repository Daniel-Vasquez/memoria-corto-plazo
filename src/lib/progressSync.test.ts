import { describe, expect, it } from 'vitest';
import { mergeProgress } from './progressSync';
import type { LevelResult, ProgressSnapshot } from '@/types/game';

function result(overrides: Partial<LevelResult>): LevelResult {
  return {
    levelId: 1,
    wpm: 5,
    accuracy: 90,
    errors: 0,
    durationMs: 1000,
    passed: true,
    ...overrides,
  };
}

describe('mergeProgress', () => {
  it('keeps the higher unlockedLevelId', () => {
    const local: ProgressSnapshot = { unlockedLevelId: 3, bestResults: {} };
    const remote: ProgressSnapshot = { unlockedLevelId: 7, bestResults: {} };
    expect(mergeProgress(local, remote).unlockedLevelId).toBe(7);
    expect(mergeProgress(remote, local).unlockedLevelId).toBe(7);
  });

  it('keeps the local bestResult when its wpm is higher', () => {
    const local: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 1: result({ wpm: 10 }) },
    };
    const remote: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 1: result({ wpm: 6 }) },
    };
    expect(mergeProgress(local, remote).bestResults[1].wpm).toBe(10);
  });

  it('takes the remote bestResult when its wpm is higher', () => {
    const local: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 1: result({ wpm: 6 }) },
    };
    const remote: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 1: result({ wpm: 10 }) },
    };
    expect(mergeProgress(local, remote).bestResults[1].wpm).toBe(10);
  });

  it('unions bestResults across levels present on only one side', () => {
    const local: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 1: result({ levelId: 1 }) },
    };
    const remote: ProgressSnapshot = {
      unlockedLevelId: 1,
      bestResults: { 2: result({ levelId: 2 }) },
    };
    const merged = mergeProgress(local, remote);
    expect(Object.keys(merged.bestResults).sort()).toEqual(['1', '2']);
  });

  it('returns the local snapshot unchanged when remote is empty', () => {
    const local: ProgressSnapshot = {
      unlockedLevelId: 5,
      bestResults: { 1: result({}) },
    };
    const remote: ProgressSnapshot = { unlockedLevelId: 1, bestResults: {} };
    expect(mergeProgress(local, remote)).toEqual(local);
  });
});
