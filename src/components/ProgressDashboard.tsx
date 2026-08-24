import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LEVELS, TIERS } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import type { LevelResult, Tier } from '@/types/game';

// Colores fijos (no siguen light/dark) validados con la skill de dataviz:
// la línea usa el acento sky-600 del proyecto; los estados reutilizan el
// par good/critical estándar, que se distingue también por forma (círculo
// vs. rombo) porque ese par no separa bien en daltonismo deuteranopo.
const LINE_COLOR = '#0284c7';
const STATUS_GOOD = '#0ca30c';
const STATUS_CRITICAL = '#d03b3b';

const TIER_TINT: Record<Tier, string> = {
  basico: '#059669',
  medio: '#0284c7',
  avanzado: '#d97706',
  master: '#f43f5e',
};

interface ChartPoint {
  id: number;
  title: string;
  tier: Tier;
  wpm: number | null;
  accuracy: number | null;
  passed: boolean | null;
  minWpm: number;
  minAccuracy: number;
}

function useIsDarkSurface() {
  // Igual que ThemeToggle: arranca en false (coincide con el render de
  // servidor) y sincroniza el valor real solo en el cliente para evitar un
  // hydration mismatch. Un MutationObserver capta los cambios de clase que
  // dispara ThemeToggle sin necesitar recargar la página.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains('dark') || root.classList.contains('theme-mixed'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function buildChartData(bestResults: Record<number, LevelResult>): ChartPoint[] {
  return LEVELS.map((level) => {
    const result = bestResults[level.id];
    return {
      id: level.id,
      title: level.title,
      tier: level.tier,
      wpm: result ? result.wpm : null,
      accuracy: result ? result.accuracy : null,
      passed: result ? result.passed : null,
      minWpm: level.minWpm,
      minAccuracy: level.minAccuracy,
    };
  });
}

function renderStatusDot(isDark: boolean) {
  const ring = isDark ? '#1e293b' : '#ffffff';
  return function StatusDot(props: any) {
    const { cx, cy, payload } = props;
    if (payload.wpm === null) return null;
    if (payload.passed) {
      return <circle cx={cx} cy={cy} r={4.5} fill={STATUS_GOOD} stroke={ring} strokeWidth={2} />;
    }
    const size = 6;
    return (
      <rect
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={STATUS_CRITICAL}
        stroke={ring}
        strokeWidth={2}
      />
    );
  };
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point: ChartPoint = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 mixed:bg-slate-800 mixed:ring-slate-700">
      <p className="font-semibold text-slate-700 dark:text-slate-100 mixed:text-slate-100">{point.title}</p>
      {point.wpm === null ? (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 mixed:text-slate-500">Aún no intentado</p>
      ) : (
        <>
          <p
            className={`mt-1 text-xs font-semibold uppercase tracking-wide ${
              point.passed ? 'text-emerald-600 dark:text-emerald-400 mixed:text-emerald-400' : 'text-rose-500'
            }`}
          >
            {point.passed ? 'Superado' : 'No superado'}
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-300 mixed:text-slate-300">
            WPM: <span className="font-mono font-medium">{point.wpm}</span>{' '}
            <span className="text-xs text-slate-400 dark:text-slate-500 mixed:text-slate-500">(objetivo {point.minWpm})</span>
          </p>
          <p className="text-slate-600 dark:text-slate-300 mixed:text-slate-300">
            Precisión: <span className="font-mono font-medium">{point.accuracy}%</span>{' '}
            <span className="text-xs text-slate-400 dark:text-slate-500 mixed:text-slate-500">
              (objetivo {point.minAccuracy}%)
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/60 px-5 py-4 shadow-sm dark:bg-slate-800/60 mixed:bg-slate-800/60">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mixed:text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-slate-700 dark:text-slate-100 mixed:text-slate-100">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 mixed:text-slate-500">{hint}</p>}
    </div>
  );
}

export default function ProgressDashboard() {
  const playerName = useGameStore((state) => state.playerName);
  const unlockedLevelId = useGameStore((state) => state.unlockedLevelId);
  const bestResults = useGameStore((state) => state.bestResults);
  const isDark = useIsDarkSurface();
  const [showTable, setShowTable] = useState(false);

  const chartData = useMemo(() => buildChartData(bestResults), [bestResults]);
  const attempted = useMemo(() => chartData.filter((p) => p.wpm !== null), [chartData]);

  const stats = useMemo(() => {
    const passedCount = attempted.filter((p) => p.passed).length;
    const avgWpm = attempted.length
      ? Math.round(attempted.reduce((sum, p) => sum + (p.wpm ?? 0), 0) / attempted.length)
      : 0;
    const avgAccuracy = attempted.length
      ? Math.round(attempted.reduce((sum, p) => sum + (p.accuracy ?? 0), 0) / attempted.length)
      : 0;
    const bestWpm = attempted.reduce((max, p) => Math.max(max, p.wpm ?? 0), 0);
    return { passedCount, avgWpm, avgAccuracy, bestWpm };
  }, [attempted]);

  const tierRanges = useMemo(
    () =>
      TIERS.map((tier) => {
        const ids = LEVELS.filter((l) => l.tier === tier.id).map((l) => l.id);
        return { tier: tier.id, label: tier.label, start: Math.min(...ids), end: Math.max(...ids) };
      }),
    []
  );

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-6xl p-6"
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Niveles superados" value={`${stats.passedCount}/40`} />
        <StatCard label="Nivel actual" value={String(unlockedLevelId)} />
        <StatCard label="WPM promedio" value={attempted.length ? String(stats.avgWpm) : '–'} hint="en niveles intentados" />
        <StatCard label="Mejor WPM" value={attempted.length ? String(stats.bestWpm) : '–'} />
      </div>

      <div className="rounded-2xl bg-white/50 p-5 dark:bg-slate-800/50 mixed:bg-slate-800/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-100 mixed:text-slate-100">
              {playerName ? `Progreso de ${playerName}` : 'Tu progreso'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mixed:text-slate-400">
              WPM por nivel, en orden cronológico (nivel 1 a 40).
            </p>
          </div>
          <button
            onClick={() => setShowTable((v) => !v)}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 mixed:bg-slate-700 mixed:text-slate-200 mixed:hover:bg-slate-600"
          >
            {showTable ? 'Ver gráfica' : 'Ver como tabla'}
          </button>
        </div>

        {attempted.length === 0 ? (
          <p className="rounded-xl bg-slate-100/70 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-900/40 dark:text-slate-400 mixed:bg-slate-900/40 mixed:text-slate-400">
            Todavía no completaste ningún nivel. Cuando termines tu primer intento, aparecerá aquí.
          </p>
        ) : showTable ? (
          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 mixed:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400 mixed:bg-slate-800 mixed:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Nivel</th>
                  <th className="px-3 py-2">WPM</th>
                  <th className="px-3 py-2">Precisión</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {attempted.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700 mixed:border-slate-700">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200 mixed:text-slate-200">{p.title}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 mixed:text-slate-300">{p.wpm}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 mixed:text-slate-300">
                      {p.accuracy}%
                    </td>
                    <td
                      className={`px-3 py-2 text-xs font-semibold ${
                        p.passed ? 'text-emerald-600 dark:text-emerald-400 mixed:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {p.passed ? 'Superado' : 'No superado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                <defs>
                  <linearGradient id="wpmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {tierRanges.map((range) => (
                  <ReferenceArea
                    key={range.tier}
                    x1={range.start}
                    x2={range.end}
                    fill={TIER_TINT[range.tier]}
                    fillOpacity={0.06}
                    stroke="none"
                  />
                ))}

                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="id"
                  type="number"
                  domain={[1, 40]}
                  ticks={[1, 10, 11, 20, 21, 30, 31, 40]}
                  stroke={gridColor}
                  tick={{ fontSize: 11, fill: axisColor }}
                  tickLine={false}
                />
                <YAxis
                  stroke={gridColor}
                  tick={{ fontSize: 11, fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={[0, 'dataMax + 10']}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: axisColor, strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="wpm"
                  stroke="none"
                  fill="url(#wpmFill)"
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  stroke={LINE_COLOR}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={renderStatusDot(isDark)}
                  activeDot={{ r: 6, fill: LINE_COLOR, stroke: isDark ? '#1e293b' : '#ffffff', strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={800}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mixed:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_GOOD }} />
                Superado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ backgroundColor: STATUS_CRITICAL }} />
                No superado
              </span>
              {TIERS.map((tier) => (
                <span key={tier.id} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full opacity-60"
                    style={{ backgroundColor: TIER_TINT[tier.id] }}
                  />
                  {tier.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
