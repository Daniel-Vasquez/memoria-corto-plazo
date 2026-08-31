import type { APIRoute, AstroCookies } from 'astro';
import { randomUUID } from 'node:crypto';
import { getProgressCollection } from '@/lib/mongodb';
import type { ProgressSnapshot } from '@/types/game';

export const prerender = false;

const PLAYER_ID_COOKIE = 'player_id';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 años

function getOrCreatePlayerId(cookies: AstroCookies): string {
  const existing = cookies.get(PLAYER_ID_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  cookies.set(PLAYER_ID_COOKIE, id, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return id;
}

function isValidLevelResult(value: unknown): value is ProgressSnapshot['bestResults'][number] {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.levelId === 'number' &&
    typeof r.wpm === 'number' &&
    typeof r.accuracy === 'number' &&
    typeof r.errors === 'number' &&
    typeof r.durationMs === 'number' &&
    typeof r.passed === 'boolean'
  );
}

// Mismo límite que el maxLength del input en NameModal.tsx.
const PLAYER_NAME_MAX_LENGTH = 30;

function isValidSnapshot(value: unknown): value is ProgressSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.playerName !== null && typeof v.playerName !== 'string') return false;
  if (typeof v.playerName === 'string' && v.playerName.length > PLAYER_NAME_MAX_LENGTH) {
    return false;
  }
  if (typeof v.unlockedLevelId !== 'number' || v.unlockedLevelId < 1 || v.unlockedLevelId > 40) {
    return false;
  }
  if (typeof v.bestResults !== 'object' || v.bestResults === null) return false;
  return Object.values(v.bestResults).every(isValidLevelResult);
}

/** GET/POST de un snapshot completo `{ playerName, unlockedLevelId, bestResults }`,
 * identificado por un id anónimo en cookie httpOnly (ver getOrCreatePlayerId).
 * Última escritura gana: es progreso de un solo jugador por id, no hace falta
 * merge server-side. */
export const GET: APIRoute = async ({ cookies }) => {
  const playerId = getOrCreatePlayerId(cookies);
  const collection = await getProgressCollection();
  const doc = await collection.findOne({ _id: playerId });

  const snapshot: ProgressSnapshot = doc
    ? {
        playerName: doc.playerName ?? null,
        unlockedLevelId: doc.unlockedLevelId,
        bestResults: doc.bestResults,
      }
    : { playerName: null, unlockedLevelId: 1, bestResults: {} };

  return new Response(JSON.stringify(snapshot), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const playerId = getOrCreatePlayerId(cookies);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  if (!isValidSnapshot(body)) {
    return new Response('Snapshot inválido', { status: 400 });
  }

  const collection = await getProgressCollection();
  await collection.updateOne(
    { _id: playerId },
    {
      $set: {
        playerName: body.playerName,
        unlockedLevelId: body.unlockedLevelId,
        bestResults: body.bestResults,
      },
    },
    { upsert: true },
  );

  return new Response(null, { status: 204 });
};
