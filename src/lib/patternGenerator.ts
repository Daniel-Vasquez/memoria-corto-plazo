import type { Tier } from '@/types/game';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?';

/** Pool de caracteres permitidos por tier: crece de solo minúsculas a
 * letras+números+símbolos a medida que sube la dificultad. */
const CHAR_POOLS: Record<Tier, string> = {
  basico: LOWERCASE,
  medio: LOWERCASE + UPPERCASE + DIGITS,
  avanzado: LOWERCASE + UPPERCASE + DIGITS + SYMBOLS,
  master: LOWERCASE + UPPERCASE + DIGITS + SYMBOLS,
};

/**
 * Longitud objetivo (min, max) por tier; se interpola linealmente entre
 * subnivel 1 y 10, con el mismo patrón que minWpm/minAccuracy en
 * `data/levels.ts`. Básico se mantiene en 4-6 caracteres a propósito (pedido
 * explícito de una sesión anterior: patrones cortos y sin espacios).
 */
const LENGTH_RANGES: Record<Tier, [number, number]> = {
  basico: [4, 6],
  medio: [7, 12],
  avanzado: [12, 18],
  master: [18, 28],
};

/**
 * Probabilidad de insertar un espacio entre caracteres, para simular saltos
 * entre "palabras". Básico se mantiene en 0: el mismo pedido anterior que
 * fijó su longitud corta también pidió patrones sin espacios para ese tier,
 * así que esta función no le aplica la probabilidad general del resto.
 */
const SPACE_PROBABILITY: Record<Tier, number> = {
  basico: 0,
  medio: 0.1,
  avanzado: 0.12,
  master: 0.12,
};

function interpolateLength(tier: Tier, subLevel: number): number {
  const [start, end] = LENGTH_RANGES[tier];
  const progress = (subLevel - 1) / 9; // subLevel va de 1 a 10
  return Math.round(start + (end - start) * progress);
}

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Genera un patrón de caracteres aleatorio para memorizar, reemplazando las
 * cadenas estáticas curadas que usaba el proyecto antes. El pool de
 * caracteres permitidos y la longitud escalan con tier/subLevel; nunca
 * genera un espacio al inicio, al final, ni dos espacios seguidos (evita
 * "palabras" vacías o patrones ambiguos de recortar).
 */
export function generateRandomPattern(tier: Tier, subLevel: number): string {
  const pool = CHAR_POOLS[tier];
  const spaceProbability = SPACE_PROBABILITY[tier];
  const length = interpolateLength(tier, subLevel);

  let pattern = '';
  let lastWasSpace = true; // arranca en true: evita que el primer carácter sea un espacio
  for (let i = 0; i < length; i += 1) {
    const isLastChar = i === length - 1;
    const canPlaceSpace = spaceProbability > 0 && !lastWasSpace && !isLastChar;
    if (canPlaceSpace && Math.random() < spaceProbability) {
      pattern += ' ';
      lastWasSpace = true;
    } else {
      pattern += randomChar(pool);
      lastWasSpace = false;
    }
  }
  return pattern;
}
