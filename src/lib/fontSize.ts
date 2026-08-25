export type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_STORAGE_KEY = 'typed-text-font-size';

export function isFontSize(value: unknown): value is FontSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function readStoredFontSize(): FontSize {
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (isFontSize(stored)) return stored;
  } catch {
    // localStorage inaccesible (modo privado, etc.) — usamos el valor por defecto.
  }
  return 'medium';
}

export function persistFontSize(fontSize: FontSize) {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  } catch {
    // localStorage inaccesible — el tamaño seguirá aplicado en esta sesión.
  }
}
