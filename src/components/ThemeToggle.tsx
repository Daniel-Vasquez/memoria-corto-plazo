import { useEffect, useState } from 'react';
import { applyTheme, persistTheme, readStoredTheme, type Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string; symbol: string }[] = [
  { value: 'light', label: 'Claro', symbol: '☀' },
  { value: 'dark', label: 'Oscuro', symbol: '☾' },
  { value: 'mixed', label: 'Mixto', symbol: '◐' },
];

export default function ThemeToggle() {
  // Astro pre-renderiza este componente en el servidor, donde no existe el
  // localStorage del usuario, así que ese HTML estático siempre asume
  // 'light'. Si leyéramos localStorage ya en el useState inicial, el primer
  // render en el cliente no coincidiría con el del servidor (hydration
  // mismatch) y el toggle quedaba en un estado inconsistente (mostrando
  // "Claro" activo tras recargar con "Oscuro" guardado, o dos opciones
  // marcadas a la vez). Por eso arrancamos en null (ningún botón activo,
  // igual que el servidor) y sincronizamos el valor real en un efecto que
  // solo corre en el cliente.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  useEffect(() => {
    if (theme === null) return;
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 p-1 dark:bg-slate-100/10 mixed:bg-slate-100/10"
    >
      {OPTIONS.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={[
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-900/10 dark:text-slate-300 dark:hover:bg-slate-100/10 mixed:text-slate-300 mixed:hover:bg-slate-100/10',
            ].join(' ')}
          >
            <span aria-hidden="true">{option.symbol}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
