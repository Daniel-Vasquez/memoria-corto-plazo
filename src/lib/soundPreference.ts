const SOUND_ENABLED_STORAGE_KEY = 'sound-enabled-preference';

export function readStoredSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
    if (stored === 'true' || stored === 'false') return stored === 'true';
  } catch {
    // localStorage inaccesible (modo privado, etc.) — usamos el valor por defecto.
  }
  return true;
}

export function persistSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage inaccesible — el valor seguirá aplicado en esta sesión.
  }
}
