import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CharState } from '@/types/game';

interface TypingStats {
  wpm: number;
  accuracy: number;
  elapsedMs: number;
}

interface UseTypingEngineResult {
  typed: string;
  charStates: CharState[];
  status: 'idle' | 'running' | 'finished';
  stats: TypingStats;
  errorCount: number;
  reset: () => void;
}

const WORD_LENGTH = 5;

export function useTypingEngine(
  target: string,
  onFinish: (stats: TypingStats, errorCount: number) => void,
  enabled = true
): UseTypingEngineResult {
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [now, setNow] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const totalKeystrokesRef = useRef(0);
  const correctKeystrokesRef = useRef(0);
  const finishedRef = useRef(false);

  // Tick while running so live WPM/accuracy stay fresh.
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [status]);

  const reset = useCallback(() => {
    setTyped('');
    setStatus('idle');
    setNow(0);
    startTimeRef.current = null;
    totalKeystrokesRef.current = 0;
    correctKeystrokesRef.current = 0;
    finishedRef.current = false;
  }, []);

  // Restart the engine whenever the target text changes (new subnivel / retry).
  useEffect(() => {
    reset();
  }, [target, reset]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (finishedRef.current) return;

      // Ignore modifier-only presses; let real navigation keys fall through.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        setTyped((prev) => prev.slice(0, -1));
        return;
      }

      if (event.key.length !== 1) return; // ignore Shift, Tab, arrows, etc.

      event.preventDefault();

      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setStatus('running');
      }

      setTyped((prev) => {
        if (prev.length >= target.length) return prev;
        const index = prev.length;
        const isCorrect = event.key === target[index];
        totalKeystrokesRef.current += 1;
        if (isCorrect) correctKeystrokesRef.current += 1;
        const next = prev + event.key;

        if (next.length === target.length) {
          finishedRef.current = true;
          const endTime = Date.now();
          const elapsedMs = startTimeRef.current ? endTime - startTimeRef.current : 0;
          const minutes = Math.max(elapsedMs / 60000, 1 / 60000);
          const words = target.length / WORD_LENGTH;
          const wpm = Math.round(words / minutes);
          const accuracy = totalKeystrokesRef.current
            ? Math.round((correctKeystrokesRef.current / totalKeystrokesRef.current) * 100)
            : 100;
          const errorCount = totalKeystrokesRef.current - correctKeystrokesRef.current;
          setStatus('finished');
          onFinish({ wpm, accuracy, elapsedMs }, errorCount);
        }

        return next;
      });
    },
    [target, onFinish]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  const charStates = useMemo<CharState[]>(() => {
    return target.split('').map((char, index) => {
      if (index < typed.length) {
        return typed[index] === char ? 'correct' : 'incorrect';
      }
      if (index === typed.length) return 'current';
      return 'pending';
    });
  }, [target, typed]);

  const stats = useMemo<TypingStats>(() => {
    const elapsedMs = startTimeRef.current ? (status === 'finished' ? now : now) - startTimeRef.current : 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60000);
    const words = typed.length / WORD_LENGTH;
    const wpm = startTimeRef.current ? Math.round(words / minutes) : 0;
    const accuracy = totalKeystrokesRef.current
      ? Math.round((correctKeystrokesRef.current / totalKeystrokesRef.current) * 100)
      : 100;
    return { wpm: Number.isFinite(wpm) ? Math.max(wpm, 0) : 0, accuracy, elapsedMs };
  }, [typed, now, status]);

  const errorCount = totalKeystrokesRef.current - correctKeystrokesRef.current;

  return { typed, charStates, status, stats, errorCount, reset };
}
