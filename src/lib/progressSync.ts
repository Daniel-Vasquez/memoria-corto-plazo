import type { ProgressSnapshot } from '@/types/game';

const PROGRESS_ENDPOINT = '/api/progress';

/** Combina snapshot local (localStorage) y remoto (Mongo): gana el mayor
 * unlockedLevelId, y por nivel gana el bestResult con mayor wpm — misma
 * regla que ya usa `completeLevel` en useGameStore.ts para decidir "isNewBest". */
export function mergeProgress(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  const bestResults: ProgressSnapshot['bestResults'] = { ...local.bestResults };
  for (const [key, remoteResult] of Object.entries(remote.bestResults)) {
    const levelId = Number(key);
    const localResult = bestResults[levelId];
    if (!localResult || remoteResult.wpm > localResult.wpm) {
      bestResults[levelId] = remoteResult;
    }
  }
  return {
    unlockedLevelId: Math.max(local.unlockedLevelId, remote.unlockedLevelId),
    bestResults,
  };
}

/** Sube el snapshot actual a Mongo. Silenciosa ante fallos (sin red, Mongo
 * caído): el juego sigue siendo jugable con localStorage como fuente de
 * verdad; se reintenta en la próxima mutación o carga de página. */
export async function pushProgress(snapshot: ProgressSnapshot): Promise<void> {
  try {
    await fetch(PROGRESS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
  } catch {
    // Ver comentario de la función.
  }
}

async function pullProgress(): Promise<ProgressSnapshot | null> {
  try {
    const response = await fetch(PROGRESS_ENDPOINT);
    if (!response.ok) return null;
    return (await response.json()) as ProgressSnapshot;
  } catch {
    return null;
  }
}

/** Se llama una sola vez al cargar la app (efecto client-only de MemoryGame.tsx).
 * Trae el snapshot remoto, lo mezcla con el local, aplica el resultado al store
 * si cambió algo localmente, y sube el merge si el servidor quedó desactualizado
 * — esto último es lo que migra a Mongo el progreso que ya vivía en localStorage
 * la primera vez que corre tras el deploy (el servidor no tiene nada todavía). */
export async function syncProgressOnLoad(
  local: ProgressSnapshot,
  applyMerged: (snapshot: ProgressSnapshot) => void,
): Promise<void> {
  const remote = await pullProgress();
  if (!remote) return;

  const merged = mergeProgress(local, remote);

  if (
    merged.unlockedLevelId !== local.unlockedLevelId ||
    JSON.stringify(merged.bestResults) !== JSON.stringify(local.bestResults)
  ) {
    applyMerged(merged);
  }

  if (
    merged.unlockedLevelId !== remote.unlockedLevelId ||
    JSON.stringify(merged.bestResults) !== JSON.stringify(remote.bestResults)
  ) {
    void pushProgress(merged);
  }
}
