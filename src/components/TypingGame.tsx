import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LEVELS, TIERS, pickRandomText } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import type { Level, LevelResult } from '@/types/game';

const CHAR_STYLES: Record<string, string> = {
  pending: 'text-slate-400',
  correct: 'text-emerald-600',
  incorrect: 'text-rose-400 bg-rose-100/60 rounded-sm',
  current: 'text-slate-700 border-b-2 border-teal-500 animate-pulse',
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
    <div className="flex flex-col items-center rounded-xl bg-white/60 px-4 py-2 shadow-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="font-mono text-lg font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function LevelSelector({
  activeLevel,
  unlockedLevelId,
  onSelect,
}: {
  activeLevel: Level;
  unlockedLevelId: number;
  onSelect: (level: Level) => void;
}) {
  return (
    <div className="space-y-4">
      {TIERS.map((tier) => (
        <div key={tier.id}>
          <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${tier.colorClass}`}>{tier.label}</h3>
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.filter((level) => level.tier === tier.id).map((level) => {
              const isUnlocked = level.id <= unlockedLevelId;
              const isActive = level.id === activeLevel.id;
              return (
                <button
                  key={level.id}
                  disabled={!isUnlocked}
                  onClick={() => onSelect(level)}
                  className={[
                    'aspect-square rounded-lg text-sm font-mono transition-colors',
                    isActive
                      ? 'bg-slate-700 text-white shadow-md'
                      : isUnlocked
                      ? 'bg-white/70 text-slate-600 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-100 text-slate-300',
                  ].join(' ')}
                >
                  {level.subLevel}
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
      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-100/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl bg-white/80 p-6 text-center shadow-lg"
      >
        <p className={`text-sm font-semibold uppercase tracking-wide ${result.passed ? 'text-emerald-600' : 'text-rose-400'}`}>
          {result.passed ? 'Nivel superado' : 'Sigue practicando'}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-700">{level.title}</h2>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatPill label="WPM" value={String(result.wpm)} />
          <StatPill label="Precisión" value={`${result.accuracy}%`} />
          <StatPill label="Errores" value={String(result.errors)} />
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Objetivo: {level.minWpm} WPM &middot; {level.minAccuracy}% precisión
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onRetry}
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-300"
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
  const unlockedLevelId = useGameStore((state) => state.unlockedLevelId);
  const completeLevel = useGameStore((state) => state.completeLevel);

  const [activeLevel, setActiveLevel] = useState<Level>(LEVELS[0]);
  const [target, setTarget] = useState<string>(() => pickRandomText(LEVELS[0]));
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    [activeLevel, completeLevel]
  );

  const { charStates, status, stats } = useTypingEngine(target, handleFinish);

  const selectLevel = useCallback((level: Level) => {
    setActiveLevel(level);
    setTarget(pickRandomText(level));
    setLastResult(null);
    setAttempt((n) => n + 1);
    containerRef.current?.focus();
  }, []);

  const retry = useCallback(() => {
    setTarget(pickRandomText(activeLevel));
    setLastResult(null);
    setAttempt((n) => n + 1);
    containerRef.current?.focus();
  }, [activeLevel]);

  const goNext = useCallback(() => {
    const next = LEVELS.find((level) => level.id === activeLevel.id + 1);
    if (next) selectLevel(next);
  }, [activeLevel, selectLevel]);

  const progressPercent = useMemo(() => {
    const total = target.length || 1;
    const typedCount = charStates.filter((s) => s !== 'pending' && s !== 'current').length;
    return Math.round((typedCount / total) * 100);
  }, [charStates, target]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-2xl bg-slate-200/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Niveles</h2>
          <LevelSelector activeLevel={activeLevel} unlockedLevelId={unlockedLevelId} onSelect={selectLevel} />
        </div>
      </aside>

      <main className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-700">{activeLevel.title}</h1>
            <p className="text-sm text-slate-500">{activeLevel.instructions}</p>
          </div>
          <div className="flex gap-3">
            <StatPill label="WPM" value={String(stats.wpm)} />
            <StatPill label="Precisión" value={`${stats.accuracy}%`} />
          </div>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          ref={containerRef}
          tabIndex={0}
          className="relative min-h-[220px] rounded-2xl bg-white/50 p-8 outline-none ring-teal-400 focus:ring-2"
        >
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
            <p className="mt-4 text-xs text-slate-400">Haz clic aquí y empieza a escribir para iniciar el cronómetro.</p>
          )}

          <AnimatePresence>
            {lastResult && (
              <ResultsOverlay result={lastResult} level={activeLevel} onRetry={retry} onNext={goNext} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
