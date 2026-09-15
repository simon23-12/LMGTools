"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicState = "aus" | "startet" | "an" | "verweigert" | "fehler";

/**
 * Misst den Raumpegel ueber das Mikrofon.
 *
 * Wichtig: Es wird nur die Lautstaerke berechnet. Nichts wird
 * aufgenommen, gespeichert oder verschickt — der Audiostrom verlaesst
 * den Arbeitsspeicher des Browsers nie.
 */
export function useMicLevel(sensitivity = 1) {
  const [state, setState] = useState<MicState>("aus");
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const smoothRef = useRef(0);
  const sensRef = useRef(sensitivity);

  useEffect(() => {
    sensRef.current = sensitivity;
  }, [sensitivity]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    smoothRef.current = 0;
    setLevel(0);
    setState("aus");
  }, []);

  const start = useCallback(async () => {
    if (state === "an" || state === "startet") return;
    setState("startet");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Automatik wuerde die Messung verfaelschen: eine leise Klasse
          // wuerde vom Browser lauter geregelt.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.fftSize);
      setState("an");

      const loop = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);

        // Wurzel spreizt den leisen Bereich, in dem sich Unterricht abspielt.
        const scaled = Math.min(1, Math.sqrt(rms * 3.2) * sensRef.current);

        // Asymmetrisch glaetten: schnell rauf, langsam runter — sonst
        // blinkt die Ampel bei jedem Huster.
        const prev = smoothRef.current;
        const alpha = scaled > prev ? 0.35 : 0.06;
        smoothRef.current = prev + (scaled - prev) * alpha;

        setLevel(smoothRef.current);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      const name = (err as DOMException)?.name;
      setState(name === "NotAllowedError" ? "verweigert" : "fehler");
    }
  }, [state]);

  useEffect(() => () => stop(), [stop]);

  return { state, level, start, stop };
}
