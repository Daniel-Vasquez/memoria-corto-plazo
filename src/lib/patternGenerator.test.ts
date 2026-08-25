import { describe, expect, it } from 'vitest';
import { generateRandomPattern } from './patternGenerator';
import type { Tier } from '@/types/game';

const TIERS: Tier[] = ['basico', 'medio', 'avanzado', 'master'];

describe('generateRandomPattern', () => {
  it('never includes a space in the basico tier', () => {
    for (let subLevel = 1; subLevel <= 10; subLevel += 1) {
      for (let i = 0; i < 20; i += 1) {
        expect(generateRandomPattern('basico', subLevel)).not.toContain(' ');
      }
    }
  });

  it('keeps basico patterns within the 4-6 character range', () => {
    for (let subLevel = 1; subLevel <= 10; subLevel += 1) {
      const pattern = generateRandomPattern('basico', subLevel);
      expect(pattern.length).toBeGreaterThanOrEqual(4);
      expect(pattern.length).toBeLessThanOrEqual(6);
    }
  });

  it('grows longer at higher subniveles within the same tier', () => {
    const first = generateRandomPattern('master', 1).length;
    const last = generateRandomPattern('master', 10).length;
    expect(last).toBeGreaterThan(first);
  });

  it('only uses lowercase letters in basico', () => {
    const pattern = generateRandomPattern('basico', 10);
    expect(pattern).toMatch(/^[a-z]+$/);
  });

  it('includes uppercase and digits in medio, but no symbols', () => {
    const pattern = Array.from({ length: 30 }, () => generateRandomPattern('medio', 10)).join('');
    expect(pattern).toMatch(/[A-Z]/);
    expect(pattern).toMatch(/[0-9]/);
    expect(pattern).not.toMatch(/[!@#$%^&*()\-_=+[\]{};:,.<>/?]/);
  });

  it('includes symbols in avanzado and master', () => {
    const symbolPattern = /[!@#$%^&*()\-_=+[\]{};:,.<>/?]/;
    const avanzado = Array.from({ length: 30 }, () => generateRandomPattern('avanzado', 10)).join(
      '',
    );
    const master = Array.from({ length: 30 }, () => generateRandomPattern('master', 10)).join('');
    expect(avanzado).toMatch(symbolPattern);
    expect(master).toMatch(symbolPattern);
  });

  it('never starts or ends with a space, and never doubles one up', () => {
    for (const tier of TIERS) {
      for (let i = 0; i < 20; i += 1) {
        const pattern = generateRandomPattern(tier, 10);
        expect(pattern.startsWith(' ')).toBe(false);
        expect(pattern.endsWith(' ')).toBe(false);
        expect(pattern).not.toContain('  ');
      }
    }
  });
});
