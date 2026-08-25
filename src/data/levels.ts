import type { Level, Tier, TierMeta } from '@/types/game';

export const TIERS: TierMeta[] = [
  {
    id: 'basico',
    label: 'Básico',
    description: 'Patrones cortos de letras minúsculas.',
    colorClass: 'text-emerald-600',
  },
  {
    id: 'medio',
    label: 'Medio',
    description: 'Letras minúsculas, mayúsculas y números.',
    colorClass: 'text-sky-600',
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    description: 'Letras, números y símbolos especiales.',
    colorClass: 'text-amber-600',
  },
  {
    id: 'master',
    label: 'Master',
    description: 'Patrones largos con letras, números y símbolos.',
    colorClass: 'text-rose-500',
  },
];

const SUBLEVELS_PER_TIER = 10;

function buildTier(
  tier: Tier,
  startId: number,
  minWpm: [number, number],
  minAcc: [number, number],
): Level[] {
  const [wpmStart, wpmEnd] = minWpm;
  const [accStart, accEnd] = minAcc;
  return Array.from({ length: SUBLEVELS_PER_TIER }, (_, index) => {
    const subLevel = index + 1;
    const progress = index / (SUBLEVELS_PER_TIER - 1);
    return {
      id: startId + index,
      tier,
      subLevel,
      title: `${tierLabel(tier)} ${subLevel}`,
      instructions: tierInstructions(tier),
      minWpm: Math.round(wpmStart + (wpmEnd - wpmStart) * progress),
      minAccuracy: Math.round(accStart + (accEnd - accStart) * progress),
    } satisfies Level;
  });
}

function tierLabel(tier: Tier): string {
  return TIERS.find((t) => t.id === tier)?.label ?? tier;
}

function tierInstructions(tier: Tier): string {
  switch (tier) {
    case 'basico':
      return 'Memoriza este patrón de letras minúsculas y reescríbelo cuando desaparezca.';
    case 'medio':
      return 'Memoriza este patrón con mayúsculas y números, y reescríbelo de memoria.';
    case 'avanzado':
      return 'Memoriza este patrón con letras, números y símbolos, y reescríbelo con precisión.';
    case 'master':
      return 'Memoriza este patrón largo, con símbolos incluidos, y reescríbelo de memoria.';
  }
}

export const LEVELS: Level[] = [
  ...buildTier('basico', 1, [10, 20], [85, 90]),
  ...buildTier('medio', 11, [20, 30], [88, 92]),
  ...buildTier('avanzado', 21, [30, 40], [90, 94]),
  ...buildTier('master', 31, [40, 60], [94, 97]),
];

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function getLevelsByTier(tier: Tier): Level[] {
  return LEVELS.filter((level) => level.tier === tier);
}
