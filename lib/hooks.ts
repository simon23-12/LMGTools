"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** Vollbild fuer den Beamer. Fehler werden bewusst geschluckt —
 *  wenn der Browser es verweigert, laeuft das Tool trotzdem. */
export function useFullscreen() {
  // Der Vollbildzustand gehoert dem Browser, nicht React — also direkt
  // von dort lesen. Das bleibt auch beim Wechsel zwischen zwei Tools
  // korrekt, wenn das Vollbild schon aktiv ist.
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* z. B. iOS Safari */
    }
  }, []);

  return { isFullscreen, toggle };
}

function subscribeFullscreen(listener: () => void): () => void {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/**
 * Verhindert, dass der Bildschirm waehrend einer laufenden Phase
 * einschlaeft. Der Browser gibt das Lock beim Tab-Wechsel frei,
 * darum holen wir es bei Rueckkehr neu.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function acquire() {
      try {
        if (!("wakeLock" in navigator)) return;
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        /* Akku-Sparmodus o. Ae. */
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible" && !lockRef.current) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}

/* ---------------------------------------------------------------
   Uhr
   Date.now() darf nicht im Render aufgerufen werden. Stattdessen
   liegt die Zeit in einem kleinen externen Store, den React ueber
   useSyncExternalStore ausliest. Gleiche Intervalle teilen sich
   einen Timer.
----------------------------------------------------------------- */

type Clock = {
  now: number;
  listeners: Set<() => void>;
  timer: number | undefined;
};

const clocks = new Map<number, Clock>();

function getClock(intervalMs: number): Clock {
  let clock = clocks.get(intervalMs);
  if (!clock) {
    clock = { now: Date.now(), listeners: new Set(), timer: undefined };
    clocks.set(intervalMs, clock);
  }
  return clock;
}

function subscribeClock(intervalMs: number, listener: () => void): () => void {
  const clock = getClock(intervalMs);
  clock.now = Date.now();
  clock.listeners.add(listener);

  if (clock.timer === undefined) {
    clock.timer = window.setInterval(() => {
      clock.now = Date.now();
      clock.listeners.forEach((l) => l());
    }, intervalMs);
  }

  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0 && clock.timer !== undefined) {
      window.clearInterval(clock.timer);
      clock.timer = undefined;
    }
  };
}

/**
 * Aktuelle Zeit in Millisekunden, die sich im gewaehlten Takt
 * erneuert. Laufende Tools nehmen 100 ms, ruhende einen groesseren
 * Wert — das spart Renderdurchgaenge, ohne dass die Anzeige altert.
 */
export function useNow(intervalMs = 1000): number {
  return useSyncExternalStore(
    useCallback(
      (listener: () => void) => subscribeClock(intervalMs, listener),
      [intervalMs],
    ),
    () => getClock(intervalMs).now,
    () => 0,
  );
}

/** Tastaturkuerzel. Greift nicht, solange in ein Feld getippt wird. */
export function useHotkeys(
  map: Record<string, (e: KeyboardEvent) => void>,
  enabled = true,
) {
  const mapRef = useRef(map);

  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      const handler =
        mapRef.current[e.key] ?? mapRef.current[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** mm:ss, bei ueber einer Stunde h:mm:ss */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/**
 * Misst ein Element fortlaufend. Mingle rechnet daraus die Zielpunkte
 * der Namensschilder aus — die muessen in Pixeln vorliegen, damit die
 * Gleitbewegung ueber `transform` laeuft und nicht ruckelt.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const beobachter = new ResizeObserver((eintraege) => {
      const box = eintraege[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, []);

  return [ref, size] as const;
}
