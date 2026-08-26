export type MemorizeSpeed = 'lento' | 'normal' | 'rapido';

const MEMORIZE_SPEED_STORAGE_KEY = 'memorize-speed-preference';

export function isMemorizeSpeed(value: unknown): value is MemorizeSpeed {
  return value === 'lento' || value === 'normal' || value === 'rapido';
}

export function readStoredMemorizeSpeed(): MemorizeSpeed {
  try {
    const stored = localStorage.getItem(MEMORIZE_SPEED_STORAGE_KEY);
    if (isMemorizeSpeed(stored)) return stored;
  } catch {
    // localStorage inaccesible (modo privado, etc.) — usamos el valor por defecto.
  }
  return 'normal';
}

export function persistMemorizeSpeed(speed: MemorizeSpeed) {
  try {
    localStorage.setItem(MEMORIZE_SPEED_STORAGE_KEY, speed);
  } catch {
    // localStorage inaccesible — la velocidad seguirá aplicada en esta sesión.
  }
}
