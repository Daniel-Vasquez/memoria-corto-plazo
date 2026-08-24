// Feedback sonoro por pulsación (tecla correcta/incorrecta) con Web Audio API
// nativo, sin dependencia externa. El AudioContext se crea perezosamente en
// la primera pulsación real (gesto del usuario) para respetar las políticas
// de autoplay de los navegadores.
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

export function playKeySound(correct: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = correct ? 'sine' : 'square';
  oscillator.frequency.value = correct ? 720 : 160;

  const now = ctx.currentTime;
  const duration = correct ? 0.05 : 0.09;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(correct ? 0.08 : 0.12, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}
