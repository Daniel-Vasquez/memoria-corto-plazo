import { MongoClient, type Collection, type Db } from 'mongodb';
import type { LevelResult } from '@/types/game';

const DB_NAME = 'memoria-corto-plazo';
const COLLECTION_NAME = 'progress';

export interface ProgressDocument {
  /** Id anónimo del jugador (cookie `player_id`, ver src/pages/api/progress.ts). */
  _id: string;
  playerName: string | null;
  unlockedLevelId: number;
  bestResults: Record<number, LevelResult>;
}

// Cacheado en una variable de módulo: en el entorno serverless de Vercel una
// misma instancia de función puede recibir varias invocaciones (warm start),
// así que reconectar en cada request agotaría las conexiones disponibles del
// cluster de Atlas. Mismo patrón que recomienda MongoDB para Next.js/Vercel.
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  const uri = import.meta.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta la variable de entorno MONGODB_URI.');
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getProgressCollection(): Promise<Collection<ProgressDocument>> {
  const client = await getClientPromise();
  const db: Db = client.db(DB_NAME);
  return db.collection<ProgressDocument>(COLLECTION_NAME);
}
