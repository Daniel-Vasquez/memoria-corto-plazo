import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playKeySound } from '@/lib/keySound';
import type { CharState } from '@/types/game';

export type MemoryPhase = 'idle' | 'memorizing' | 'recalling' | 'finished';

interface MemoryStats {
  wpm: number;
  accuracy: number;
  elapsedMs: number;
}

interface UseMemoryEngineResult {
  phase: MemoryPhase;
  typed: string;
  memorizeDurationMs: number;
  memorizeMsLeft: number;
  charStates: CharState[];
  start: () => void;
  updateTyped: (value: string) => void;
  submit: () => void;
}

const WORD_LENGTH = 5;
const MIN_MEMORIZE_MS = 3000;
const MAX_MEMORIZE_MS = 9000;
const BASE_MEMORIZE_MS = 2200;
const MS_PER_CHAR = 90;

/**
 * Tiempo de memorización en ms: crece con la longitud del texto (más para
 * párrafos/código del tier Master) pero se mantiene en el rango ~3-9s
 * pedido — ni instantáneo para textos cortos ni interminable para los largos.
 */
export function getMemorizeDurationMs(target: string): number {
  const raw = BASE_MEMORIZE_MS + target.length * MS_PER_CHAR;
  return Math.min(MAX_MEMORIZE_MS, Math.max(MIN_MEMORIZE_MS, Math.round(raw)));
}

function diffCharStates(typed: string, target: string): CharState[] {
  return typed.split('').map((char, index) => (char === target[index] ? 'correct' : 'incorrect'));
}

/**
 * Máquina de estados de 3 fases: memorizing (se muestra el texto, input
 * bloqueado) -> recalling (texto oculto, input habilitado) -> finished
 * (se compara typed vs target). A diferencia del motor de mecanografía
 * anterior, la comparación no ocurre por pulsación sino de una sola vez en
 * submit(), porque mientras el usuario escribe no hay nada visible contra
 * qué comparar.
 */
export function useMemoryEngine(
  target: string,
  onFinish: (stats: MemoryStats, errorCount: number) => void,
  enabled = true,
): UseMemoryEngineResult {
  const [phase, setPhase] = useState<MemoryPhase>('idle');
  const [typed, setTyped] = useState('');
  const [now, setNow] = useState(0);

  const memorizeStartRef = useRef<number | null>(null);
  const recallStartRef = useRef<number | null>(null);
  const memorizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);

  const memorizeDurationMs = useMemo(() => getMemorizeDurationMs(target), [target]);

  const clearMemorizeTimeout = useCallback(() => {
    if (memorizeTimeoutRef.current) {
      clearTimeout(memorizeTimeoutRef.current);
      memorizeTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearMemorizeTimeout();
    setPhase('idle');
    setTyped('');
    setNow(0);
    memorizeStartRef.current = null;
    recallStartRef.current = null;
    finishedRef.current = false;
  }, [clearMemorizeTimeout]);

  // Reinicia el motor cuando cambia el texto objetivo (nuevo subnivel / reintento).
  useEffect(() => {
    reset();
  }, [target, reset]);

  useEffect(() => clearMemorizeTimeout, [clearMemorizeTimeout]);

  // Cuenta regresiva mientras se memoriza, para que la barra de progreso se actualice.
  useEffect(() => {
    if (phase !== 'memorizing') return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [phase]);

  const start = useCallback(() => {
    if (!enabled || phase !== 'idle') return;
    const startedAt = Date.now();
    memorizeStartRef.current = startedAt;
    setNow(startedAt);
    setPhase('memorizing');
    memorizeTimeoutRef.current = setTimeout(() => {
      recallStartRef.current = Date.now();
      setPhase('recalling');
    }, memorizeDurationMs);
  }, [enabled, phase, memorizeDurationMs]);

  // Cualquier tecla en reposo arranca la memorización, igual que el motor
  // anterior dejaba iniciar el cronómetro con la primera pulsación.
  useEffect(() => {
    if (!enabled || phase !== 'idle') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      start();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, phase, start]);

  const updateTyped = useCallback(
    (value: string) => {
      if (phase !== 'recalling' || finishedRef.current) return;
      setTyped((prev) => {
        if (value.length > prev.length) playKeySound(true);
        return value;
      });
    },
    [phase],
  );

  const submit = useCallback(() => {
    if (phase !== 'recalling' || finishedRef.current) return;
    finishedRef.current = true;

    const maxLen = Math.max(typed.length, target.length);
    let correct = 0;
    for (let i = 0; i < maxLen; i += 1) {
      if (typed[i] !== undefined && typed[i] === target[i]) correct += 1;
    }
    const errorCount = maxLen - correct;
    const accuracy = target.length ? Math.round((correct / target.length) * 100) : 100;

    const endTime = Date.now();
    const elapsedMs = recallStartRef.current ? endTime - recallStartRef.current : 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60000);
    const words = typed.length / WORD_LENGTH;
    const wpm = typed.length ? Math.round(words / minutes) : 0;

    setPhase('finished');
    onFinish({ wpm, accuracy, elapsedMs }, errorCount);
  }, [phase, typed, target, onFinish]);

  const memorizeMsLeft = useMemo(() => {
    if (phase !== 'memorizing' || memorizeStartRef.current === null) return memorizeDurationMs;
    const elapsed = now - memorizeStartRef.current;
    return Math.max(memorizeDurationMs - elapsed, 0);
  }, [phase, now, memorizeDurationMs]);

  const charStates = useMemo<CharState[]>(() => {
    if (phase !== 'finished') return [];
    return diffCharStates(typed, target);
  }, [phase, typed, target]);

  return {
    phase,
    typed,
    memorizeDurationMs,
    memorizeMsLeft,
    charStates,
    start,
    updateTyped,
    submit,
  };
}
