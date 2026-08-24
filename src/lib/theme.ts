export type Theme = 'light' | 'dark';

// Duplicado a propósito en el <script is:inline> de src/layouts/Layout.astro
// (el script anti-FOUC debe ser síncrono y no puede importar este módulo).
// Si cambia STORAGE_KEY o los valores válidos de Theme, hay que actualizar
// también ese script.
export const THEME_STORAGE_KEY = 'theme-preference';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // localStorage inaccesible (modo privado, etc.) — usamos el valor por defecto.
  }
  return 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function persistTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage inaccesible — el tema seguirá aplicado en esta sesión.
  }
}
