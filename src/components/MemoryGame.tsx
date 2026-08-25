import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LEVELS, TIERS } from '@/data/levels';
import { generateRandomPattern } from '@/lib/patternGenerator';
import { useGameStore } from '@/store/useGameStore';
import { useMemoryEngine } from '@/hooks/useMemoryEngine';
import NameModal from '@/components/NameModal';
import ConfirmModal from '@/components/ConfirmModal';
import { cn } from '@/lib/cn';
import { readStoredFontSize, persistFontSize, type FontSize } from '@/lib/fontSize';
import type { CharState, Level, LevelResult } from '@/types/game';

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

const CHAR_STYLES: Record<CharState, string> = {
  correct: 'text-emerald-600 dark:text-emerald-400',
  incorrect: 'text-rose-500 bg-rose-100/60 rounded-sm dark:bg-rose-900/40',
};

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-base sm:text-lg',
  medium: 'text-xl sm:text-2xl',
  large: 'text-2xl sm:text-3xl',
};

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: 'Pequeño' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
];

function MemorizeText({ target, fontSize }: { target: string; fontSize: FontSize }) {
  return (
    <p
      className={cn(
        'font-mono leading-relaxed tracking-wide whitespace-pre-wrap break-words text-slate-700 dark:text-slate-100',
        FONT_SIZE_CLASSES[fontSize],
      )}
    >
      {target}
    </p>
  );
}

/** Compara typed contra target: colorea lo que el jugador escribió, y marca
 * en el texto original los caracteres que se quedaron sin escribir. */
function DiffView({
  typed,
  target,
  charStates,
  fontSize,
}: {
  typed: string;
  target: string;
  charStates: CharState[];
  fontSize: FontSize;
}) {
  const missing = target.length > typed.length;
  return (
    <div className="space-y-3 text-left">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Lo que escribiste
        </p>
        <p
          className={cn(
            'font-mono leading-relaxed tracking-wide whitespace-pre-wrap break-words',
            FONT_SIZE_CLASSES[fontSize],
          )}
        >
          {typed.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500">(nada)</span>
          ) : (
            typed.split('').map((char, index) => (
              <span key={index} className={CHAR_STYLES[charStates[index] ?? 'incorrect']}>
                {char === ' ' ? ' ' : char}
              </span>
            ))
          )}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Texto original
        </p>
        <p
          className={cn(
            'font-mono leading-relaxed tracking-wide whitespace-pre-wrap break-words text-slate-500 dark:text-slate-400',
            FONT_SIZE_CLASSES[fontSize],
          )}
        >
          {target}
        </p>
        {missing && (
          <p className="mt-1 text-xs text-rose-500">
            Te faltaron {target.length - typed.length} caracteres por escribir.
          </p>
        )}
      </div>
    </div>
  );
}

function FontSizeToggle({
  fontSize,
  onChange,
}: {
  fontSize: FontSize;
  onChange: (value: FontSize) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tamaño de letra del texto"
      className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 p-1 dark:bg-slate-100/10"
    >
      {FONT_SIZE_OPTIONS.map((option) => {
        const isActive = fontSize === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-900/10 dark:text-slate-300 dark:hover:bg-slate-100/10',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
  typed,
  target,
  charStates,
  fontSize,
  onRetry,
  onNext,
}: {
  result: LevelResult;
  level: Level;
  typed: string;
  target: string;
  charStates: CharState[];
  fontSize: FontSize;
  onRetry: () => void;
  onNext: () => void;
}) {
  const hasNext = level.id < LEVELS.length;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative col-start-1 row-start-1 rounded-2xl bg-slate-100/95 backdrop-blur-sm dark:bg-slate-900/95"
    >
      {result.passed && <Confetti />}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="mx-auto my-6 w-full max-w-md rounded-2xl bg-white/80 p-6 text-center shadow-lg dark:bg-slate-800/90"
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

        <div className="mt-5 rounded-xl bg-slate-100/70 p-4 dark:bg-slate-900/40">
          <DiffView typed={typed} target={target} charStates={charStates} fontSize={fontSize} />
        </div>

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

export default function MemoryGame() {
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const unlockedLevelId = useGameStore((state) => state.unlockedLevelId);
  const bestResults = useGameStore((state) => state.bestResults);
  const completeLevel = useGameStore((state) => state.completeLevel);
  const resetProgress = useGameStore((state) => state.resetProgress);

  const [activeLevel, setActiveLevel] = useState<Level>(LEVELS[0]);
  // Se genera una sola vez por intento (acá, y en selectLevel/retry más
  // abajo) — nunca dentro de un render ni durante memorizing/recalling —
  // para que el patrón se mantenga estable mientras dura el intento.
  const [target, setTarget] = useState<string>(() =>
    generateRandomPattern(LEVELS[0].tier, LEVELS[0].subLevel),
  );
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Igual que ThemeToggle: Astro pre-renderiza este componente en el
  // servidor sin acceso a localStorage, así que arrancamos en null (mismo
  // valor que ve el servidor) y sincronizamos el real en un efecto que solo
  // corre en el cliente, para evitar un hydration mismatch.
  const [fontSize, setFontSize] = useState<FontSize | null>(null);

  useEffect(() => {
    setFontSize(readStoredFontSize());
  }, []);

  useEffect(() => {
    if (fontSize === null) return;
    persistFontSize(fontSize);
  }, [fontSize]);

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

  const engineEnabled = Boolean(playerName) && !showResetConfirm;
  const {
    phase,
    typed,
    memorizeDurationMs,
    memorizeMsLeft,
    charStates,
    start,
    updateTyped,
    submit,
  } = useMemoryEngine(target, handleFinish, engineEnabled);

  useEffect(() => {
    if (phase === 'recalling') inputRef.current?.focus();
  }, [phase]);

  const selectLevel = useCallback((level: Level) => {
    setActiveLevel(level);
    setTarget(generateRandomPattern(level.tier, level.subLevel));
    setLastResult(null);
    setAttempt((n) => n + 1);
  }, []);

  const retry = useCallback(() => {
    setTarget(generateRandomPattern(activeLevel.tier, activeLevel.subLevel));
    setLastResult(null);
    setAttempt((n) => n + 1);
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

  const handleContainerClick = useCallback(() => {
    if (!engineEnabled) return;
    if (phase === 'idle') start();
    if (phase === 'recalling') inputRef.current?.focus();
  }, [engineEnabled, phase, start]);

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const progressPercent = useMemo(() => {
    if (phase === 'memorizing') {
      return Math.round((memorizeMsLeft / memorizeDurationMs) * 100);
    }
    if (phase === 'recalling' || phase === 'finished') {
      const total = target.length || 1;
      return Math.min(100, Math.round((typed.length / total) * 100));
    }
    return 0;
  }, [phase, memorizeMsLeft, memorizeDurationMs, typed, target]);

  const memorizeSecondsLeft = Math.ceil(memorizeMsLeft / 1000);

  const liveAnnouncement = useMemo(() => {
    if (lastResult) {
      return lastResult.passed
        ? `Nivel superado. ${lastResult.wpm} palabras por minuto, ${lastResult.accuracy}% de precisión.`
        : `Aún no superado. ${lastResult.wpm} palabras por minuto, ${lastResult.accuracy}% de precisión.`;
    }
    if (phase === 'memorizing') return 'Memoriza el texto en pantalla.';
    if (phase === 'recalling') return 'Escribe de memoria lo que acabas de ver.';
    return '';
  }, [lastResult, phase]);

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
              label={lastResult ? 'WPM' : 'Mejor WPM'}
              value={lastResult ? String(lastResult.wpm) : String(bestResult?.wpm ?? DASH)}
            />
            <StatPill
              label={lastResult ? 'Precisión' : 'Mejor precisión'}
              value={
                lastResult
                  ? `${lastResult.accuracy}%`
                  : bestResult
                    ? `${bestResult.accuracy}%`
                    : DASH
              }
            />
          </div>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-150',
              phase === 'memorizing' ? 'bg-amber-500' : 'bg-teal-500',
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mb-3 flex justify-end">
          <FontSizeToggle fontSize={fontSize ?? 'medium'} onChange={setFontSize} />
        </div>

        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className="relative grid min-h-[220px] rounded-2xl bg-white/50 p-8 ring-teal-400 focus-within:ring-2 dark:bg-slate-800/50"
        >
          <div aria-live="polite" className="sr-only">
            {liveAnnouncement}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeLevel.id}-${attempt}-${phase}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="col-start-1 row-start-1"
            >
              {phase === 'idle' && (
                <div>
                  <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
                    Vas a memorizar este texto durante {Math.ceil(memorizeDurationMs / 1000)}{' '}
                    segundos. Cuando desaparezca, lo reescribirás de memoria.
                  </p>
                  <button
                    type="button"
                    onClick={start}
                    disabled={!engineEnabled}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Memorizar
                  </button>
                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    O simplemente pulsa cualquier tecla para empezar.
                  </p>
                </div>
              )}

              {phase === 'memorizing' && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/90 px-2 font-mono text-xs font-semibold text-white">
                      {memorizeSecondsLeft}s
                    </span>
                    <span className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Memorizando…
                    </span>
                  </div>
                  <MemorizeText target={target} fontSize={fontSize ?? 'medium'} />
                </div>
              )}

              {(phase === 'recalling' || phase === 'finished') && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-teal-600 dark:text-teal-400">
                      Escribe de memoria lo que acabas de ver
                    </span>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={typed}
                    onChange={(event) => updateTyped(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    disabled={phase !== 'recalling' || !engineEnabled}
                    rows={3}
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label="Escribe aquí lo que recuerdas del texto"
                    placeholder="Escribe aquí…"
                    className={cn(
                      'w-full resize-none rounded-xl border border-slate-300 bg-white/80 p-3 font-mono leading-relaxed tracking-wide text-slate-700 outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-70 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100',
                      FONT_SIZE_CLASSES[fontSize ?? 'medium'],
                    )}
                  />
                  {phase === 'recalling' && (
                    <button
                      type="button"
                      onClick={submit}
                      className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                    >
                      Comprobar
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {lastResult && (
              <ResultsOverlay
                result={lastResult}
                level={activeLevel}
                typed={typed}
                target={target}
                charStates={charStates}
                fontSize={fontSize ?? 'medium'}
                onRetry={retry}
                onNext={goNext}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
