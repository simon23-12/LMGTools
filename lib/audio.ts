"use client";

/**
 * Alle Toene werden synthetisiert — keine Audiodateien, kein Blob,
 * nichts, was nachgeladen werden muesste. Funktioniert offline.
 */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Muss aus einem echten Klick heraus laufen, sonst blockt der Browser. */
export function unlockAudio() {
  context();
}

type ToneOptions = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({
  freq,
  duration,
  type = "sine",
  gain = 0.25,
  delay = 0,
}: ToneOptions) {
  const ac = context();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Warmer Doppelgong zum Phasenende. */
export function playGong() {
  tone({ freq: 523.25, duration: 1.6, type: "sine", gain: 0.3 });
  tone({ freq: 784, duration: 1.9, type: "sine", gain: 0.16, delay: 0.06 });
  tone({ freq: 261.63, duration: 2.4, type: "sine", gain: 0.2, delay: 0.02 });
}

/** Kurzer heller Klick — Vorwarnung, letzte Sekunden. */
export function playTick(high = false) {
  tone({
    freq: high ? 1320 : 880,
    duration: 0.09,
    type: "triangle",
    gain: 0.14,
  });
}

/** Aufsteigend: etwas ist fertig / jemand wurde gezogen. */
export function playReveal() {
  tone({ freq: 587.33, duration: 0.35, type: "triangle", gain: 0.2 });
  tone({ freq: 880, duration: 0.45, type: "triangle", gain: 0.18, delay: 0.1 });
}

/** Absteigend, dezent — Ampel springt auf Rot. */
export function playAlert() {
  tone({ freq: 440, duration: 0.3, type: "sawtooth", gain: 0.1 });
  tone({ freq: 330, duration: 0.4, type: "sawtooth", gain: 0.1, delay: 0.14 });
}
