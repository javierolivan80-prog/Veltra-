/**
 * Rest-timer alerts. The point of the timer is to let you put the phone down,
 * which only works if it can get your attention when the rest is over.
 *
 * Audio is synthesized with WebAudio so there's no asset to ship or fail to
 * load. iOS only allows playback from an AudioContext created/resumed inside a
 * user gesture, so `primeAlerts()` must be called from the tap that starts the
 * rest — after that the timer can beep on its own. That same tap is also used
 * to ask for Notification permission, for the same reason: browsers require a
 * user gesture in the chain, and asking mid-rest (no gesture) would be a
 * silent no-op.
 *
 * Vibration is best-effort: iOS Safari ignores navigator.vibrate entirely.
 */

const MUTED_KEY = "veltra-rest-alert-muted";

let ctx: AudioContext | null = null;

export function isAlertMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAlertMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // storage unavailable (private mode) — the setting just won't persist
  }
}

/** Call from a user gesture so the browser lets us make sound (and ask for
 *  notification permission) later. */
export function primeAlerts(): void {
  if (typeof window === "undefined" || isAlertMuted()) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }

  // A no-op once the user has already answered — safe to call every time.
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function beep(startAt: number, frequency: number, duration: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  // Short attack/decay ramps — a raw square edge clicks unpleasantly.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** Three rising beeps + a vibration pattern, where each is available. */
export function playRestFinishedAlert(): void {
  if (typeof window === "undefined" || isAlertMuted()) return;

  try {
    if (ctx && ctx.state === "running") {
      const t = ctx.currentTime;
      beep(t, 660, 0.12);
      beep(t + 0.18, 660, 0.12);
      beep(t + 0.36, 880, 0.22);
    }
  } catch {
    // never let an audio failure break the timer
  }

  try {
    navigator.vibrate?.([160, 90, 160, 90, 260]);
  } catch {
    // unsupported (notably iOS Safari)
  }

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("¡Tiempo!", { body: "Set completado", icon: "/icon.svg", tag: "rest-timer" });
    }
  } catch {
    // never let a notification failure break the timer
  }
}
