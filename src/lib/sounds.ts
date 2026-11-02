/** Sound effects can be turned off per device in Settings → Sounds; they're on by default. */
export const SOUNDS_KEY = "todobee:sounds";

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem(SOUNDS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(SOUNDS_KEY, on ? "on" : "off");
}

let ctx: AudioContext | null = null;

/** One wooden, marimba-like note: a warm body plus a short bright "tock" on top. */
function mallet(audio: AudioContext, out: AudioNode, freq: number, t: number, level: number) {
  const partials: [ratio: number, gain: number, decay: number][] = [
    [1, 1, 0.55], // body
    [4, 0.22, 0.07], // strike
    [10, 0.06, 0.025], // click
  ];
  for (const [ratio, g, decay] of partials) {
    const osc = audio.createOscillator();
    const env = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(level * g, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/**
 * A quick, cheerful "ta-da": two rising marimba notes (G5 → C6) with a soft sparkle,
 * made in the browser so there's no file to download.
 */
export function playCompleteSound() {
  if (typeof window === "undefined" || !soundsEnabled()) return;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    ctx ??= new AC();
    const audio = ctx;
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime + 0.01;

    // Gentle low-pass keeps the top end soft instead of piercing.
    const tone = audio.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 6000;
    const master = audio.createGain();
    master.gain.value = 0.32;
    tone.connect(master).connect(audio.destination);

    mallet(audio, tone, 783.99, now, 0.7); // G5
    mallet(audio, tone, 1046.5, now + 0.085, 0.85); // C6

    // A faint high shimmer on the second note.
    const sparkle = audio.createOscillator();
    const sEnv = audio.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(2093, now + 0.085); // C7
    sparkle.frequency.exponentialRampToValueAtTime(2637, now + 0.3); // up to E7
    sEnv.gain.setValueAtTime(0.0001, now + 0.085);
    sEnv.gain.exponentialRampToValueAtTime(0.05, now + 0.1);
    sEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    sparkle.connect(sEnv).connect(tone);
    sparkle.start(now + 0.085);
    sparkle.stop(now + 0.45);
  } catch {
    // Sound is a nice-to-have; never let it break completing a task.
  }
}
