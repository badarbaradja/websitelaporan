/**
 * playAlertSound — Web Audio API alert tones
 *
 * Generates short synthesized beeps without external audio files.
 * - "warn": single 660Hz tone, 150ms — a gentle "notice" beep
 * - "bad":  two rapid tones (880Hz → 660Hz), 150ms each — urgent double beep
 *
 * IMPORTANT — AudioContext & browser autoplay policy:
 * The AudioContext is created ONCE as a module-level singleton. Browsers
 * create it in "suspended" state and only allow resume() inside a direct
 * user-gesture event handler (click/tap). Call resumeAudioContext() from
 * your onClick handler so the singleton gets unlocked for the rest of
 * the session. After that, playAlertSound() will work from any context
 * (Realtime callbacks, timers, etc.).
 */

let audioCtx: AudioContext | null = null;

/** Get (or lazily create) the singleton AudioContext. */
function getOrCreateContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Resume the singleton AudioContext.
 * MUST be called from a direct user-gesture handler (e.g. onClick)
 * at least once to unlock audio for the rest of the session.
 */
export function resumeAudioContext(): void {
  try {
    const ctx = getOrCreateContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {
    // ignore
  }
}

function playBeep(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Fade in/out to avoid clicks
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playAlertSound(tone: "warn" | "bad"): void {
  try {
    const ctx = getOrCreateContext();
    if (!ctx || ctx.state === "suspended") return; // not unlocked yet

    const now = ctx.currentTime;
    const beepDuration = 0.15; // 150ms

    if (tone === "warn") {
      // Single lower-pitched beep
      playBeep(ctx, 660, now, beepDuration);
    } else {
      // Two rapid higher-pitched beeps (urgent)
      playBeep(ctx, 880, now, beepDuration);
      playBeep(ctx, 660, now + beepDuration + 0.05, beepDuration);
    }
  } catch {
    // Silently ignore — audio is non-critical
  }
}
