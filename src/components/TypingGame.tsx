import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LEVELS, TIERS, pickRandomText } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import NameModal from '@/components/NameModal';
import ConfirmModal from '@/components/ConfirmModal';
import VirtualKeyboard from '@/components/VirtualKeyboard';
import { cn } from '@/lib/cn';
import type { Level, LevelResult } from '@/types/game';

const CONFETTI_COLORS = ['#0d9488', '#059669', '#f59e0b', '#38bdf8', '#f43f5e'];

function Confetti() {
  const shouldReduceMotion = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 60 + Math.random() * 50;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 20,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: Math.random() * 0.15,
        };
      }),
    [],
  );

  if (shouldReduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute h-2 w-2 rounded-sm"
          style={{ backgroundColor: piece.color }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6, rotate: 0 }}
          animate={{ opacity: 0, x: piece.x, y: piece.y, scale: 1, rotate: 180 }}
          transition={{ duration: 0.7, delay: piece.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

const DASH = '–';

const CHAR_STYLES: Record<string, string> = {
  pending: 'text-slate-400 dark:text-slate-500',
  correct: 'text-emerald-600 dark:text-emerald-400',
  incorrect: 'text-rose-400 bg-rose-100/60 rounded-sm dark:bg-rose-900/40',
  current: 'text-slate-700 border-b-2 border-teal-500 animate-pulse dark:text-slate-100',
};

function TypedText({ target, charStates }: { target: string; charStates: string[] }) {
  return (
    <p className="font-mono text-xl sm:text-2xl leading-relaxed tracking-wide whitespace-pre-wrap break-words">
      {target.split('').map((char, index) => (
        <span key={index} className={CHAR_STYLES[charStates[index]]}>
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </p>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/60 px-4 py-2 shadow-sm dark:bg-slate-800/60">
      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function LevelSelector({
  activeLevel,
  unlockedLevelId,
  bestResults,
  onSelect,
}: {
  activeLevel: Level;
  unlockedLevelId: number;
  bestResults: Record<number, LevelResult>;
  onSelect: (level: Level) => void;
}) {
  return (
    <div className="space-y-4">
      {TIERS.map((tier) => (
        <div key={tier.id}>
          <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${tier.colorClass}`}>
            {tier.label}
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.filter((level) => level.tier === tier.id).map((level) => {
              const isUnlocked = level.id <= unlockedLevelId;
              const isActive = level.id === activeLevel.id;
              const best = bestResults[level.id];
              return (
                <button
                  key={level.id}
                  disabled={!isUnlocked}
                  onClick={() => onSelect(level)}
                  title={best ? `${best.wpm} WPM · ${best.accuracy}%` : undefined}
                  className={cn(
                    'relative aspect-square rounded-lg text-sm font-mono transition-colors',
                    isActive
                      ? 'bg-slate-700 text-white shadow-md dark:bg-teal-600'
                      : isUnlocked
                        ? 'bg-white/70 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-600'
                        : 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600',
                  )}
                >
                  {level.subLevel}
                  {best && (
                    <span
                      className={cn(
                        'absolute right-1 top-1 h-1.5 w-1.5 rounded-full',
                        best.passed ? 'bg-emerald-500' : 'bg-rose-400',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsOverlay({
  result,
  level,
  onRetry,
  onNext,
}: {
  result: LevelResult;
  level: Level;
  onRetry: () => void;
  onNext: () => void;
}) {
  const hasNext = level.id < LEVELS.length;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-100/90 backdrop-blur-sm dark:bg-slate-900/90"
    >
      {result.passed && <Confetti />}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl bg-white/80 p-6 text-center shadow-lg dark:bg-slate-800/90"
      >
        <p
          className={`text-sm font-semibold uppercase tracking-wide ${
            result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-400'
          }`}
        >
          {result.passed ? 'Nivel superado' : 'Sigue practicando'}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-100">
          {level.title}
        </h2>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatPill label="WPM" value={String(result.wpm)} />
          <StatPill label="Precisión" value={`${result.accuracy}%`} />
          <StatPill label="Errores" value={String(result.errors)} />
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Objetivo: {level.minWpm} WPM &middot; {level.minAccuracy}% precisión
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onRetry}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Reintentar
          </button>
          {result.passed && hasNext && (
            <button
              onClick={onNext}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Siguiente nivel
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TypingGame() {
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const unlockedLevelId = useGameStore((state) => state.unlockedLevelId);
  const bestResults = useGameStore((state) => state.bestResults);
  const completeLevel = useGameStore((state) => state.completeLevel);
  const resetProgress = useGameStore((state) => state.resetProgress);

  const [activeLevel, setActiveLevel] = useState<Level>(LEVELS[0]);
  const [target, setTarget] = useState<string>(() => pickRandomText(LEVELS[0]));
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFinish = useCallback(
    (stats: { wpm: number; accuracy: number; elapsedMs: number }, errorCount: number) => {
      const passed = stats.wpm >= activeLevel.minWpm && stats.accuracy >= activeLevel.minAccuracy;
      const result: LevelResult = {
        levelId: activeLevel.id,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errors: errorCount,
        durationMs: stats.elapsedMs,
        passed,
      };
      setLastResult(result);
      completeLevel(result);
    },
    [activeLevel, completeLevel],
  );

  const typingEnabled = Boolean(playerName) && !showResetConfirm;
  const { charStates, status, stats } = useTypingEngine(target, handleFinish, typingEnabled);

  const selectLevel = useCallback((level: Level) => {
    setActiveLevel(level);
    setTarget(pickRandomText(level));
    setLastResult(null);
    setAttempt((n) => n + 1);
    inputRef.current?.focus();
  }, []);

  const retry = useCallback(() => {
    setTarget(pickRandomText(activeLevel));
    setLastResult(null);
    setAttempt((n) => n + 1);
    inputRef.current?.focus();
  }, [activeLevel]);

  const goNext = useCallback(() => {
    const next = LEVELS.find((level) => level.id === activeLevel.id + 1);
    if (next) selectLevel(next);
  }, [activeLevel, selectLevel]);

  const confirmResetProgress = useCallback(() => {
    resetProgress();
    setShowResetConfirm(false);
    selectLevel(LEVELS[0]);
  }, [resetProgress, selectLevel]);

  const bestResult = bestResults[activeLevel.id];

  const progressPercent = useMemo(() => {
    const total = target.length || 1;
    const typedCount = charStates.filter((s) => s !== 'pending' && s !== 'current').length;
    return Math.round((typedCount / total) * 100);
  }, [charStates, target]);

  const nextIndex = charStates.indexOf('current');
  const nextChar = nextIndex === -1 ? undefined : target[nextIndex];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:flex-row">
      <AnimatePresence>{!playerName && <NameModal onSubmit={setPlayerName} />}</AnimatePresence>
      <AnimatePresence>
        {showResetConfirm && (
          <ConfirmModal
            title="Reiniciar progreso"
            message="Se perderá tu nivel desbloqueado y tus mejores resultados. Esta acción no se puede deshacer."
            confirmLabel="Sí, reiniciar"
            onConfirm={confirmResetProgress}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}
      </AnimatePresence>

      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-2xl bg-slate-200/60 p-4 dark:bg-slate-800/60">
          {playerName && (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              Hola, <span className="font-semibold">{playerName}</span>
            </p>
          )}
          <h2 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Niveles</h2>
          <LevelSelector
            activeLevel={activeLevel}
            unlockedLevelId={unlockedLevelId}
            bestResults={bestResults}
            onSelect={selectLevel}
          />

          <button
            onClick={() => setShowResetConfirm(true)}
            className="mt-5 w-full rounded-lg bg-white/70 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-50 dark:bg-slate-700/70 dark:hover:bg-rose-950/40"
          >
            Reiniciar progreso
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-700 dark:text-slate-100">
              {activeLevel.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{activeLevel.instructions}</p>
            {bestResult && (
              <p
                className={`mt-1 text-xs font-medium ${
                  bestResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-400'
                }`}
              >
                {bestResult.passed ? 'Nivel superado' : 'Aún no superado'}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <StatPill
              label={status === 'idle' ? 'Mejor WPM' : 'WPM'}
              value={status === 'idle' ? String(bestResult?.wpm ?? DASH) : String(stats.wpm)}
            />
            <StatPill
              label={status === 'idle' ? 'Mejor precisión' : 'Precisión'}
              value={
                status === 'idle'
                  ? bestResult
                    ? `${bestResult.accuracy}%`
                    : DASH
                  : `${stats.accuracy}%`
              }
            />
          </div>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          onClick={() => inputRef.current?.focus()}
          className="relative min-h-[220px] rounded-2xl bg-white/50 p-8 ring-teal-400 focus-within:ring-2 dark:bg-slate-800/50"
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Área de escritura del ejercicio"
            disabled={!typingEnabled}
            className="sr-only"
          />

          <div aria-live="polite" className="sr-only">
            {lastResult
              ? lastResult.passed
                ? `Nivel superado. ${lastResult.wpm} palabras por minuto, ${lastResult.accuracy}% de precisión.`
                : `Aún no superado. ${lastResult.wpm} palabras por minuto, ${lastResult.accuracy}% de precisión.`
              : ''}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeLevel.id}-${attempt}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <TypedText target={target} charStates={charStates} />
            </motion.div>
          </AnimatePresence>

          {status === 'idle' && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Haz clic aquí y empieza a escribir para iniciar el cronómetro.
            </p>
          )}

          <AnimatePresence>
            {lastResult && (
              <ResultsOverlay
                result={lastResult}
                level={activeLevel}
                onRetry={retry}
                onNext={goNext}
              />
            )}
          </AnimatePresence>
        </div>

        <VirtualKeyboard nextChar={nextChar} />
      </main>
    </div>
  );
}
