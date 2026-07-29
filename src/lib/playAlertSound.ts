/**
 * playAlertSound — Web Audio API alert tones
 *
 * Generates short synthesized beeps without external audio files.
 * - "warn": single 660Hz tone, 150ms — a gentle "notice" beep
 * - "bad":  two rapid tones (880Hz → 660Hz), 150ms each — urgent double beep
 *
 * All AudioContext access is wrapped in try-catch so a browser that blocks
 * audio (e.g. autoplay policy before user gesture) won't crash the app.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
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
    const ctx = getAudioContext();
    if (!ctx) return;

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
