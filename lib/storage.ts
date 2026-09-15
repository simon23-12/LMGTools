"use client";

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "lmg.";

/**
 * localStorage als externer Store.
 *
 * useSyncExternalStore statt useState+useEffect: React liest den Wert
 * selbst zum richtigen Zeitpunkt, die Server-Ausgabe bleibt der
 * Vorgabewert, und ein zweiter Tab bekommt Aenderungen automatisch mit.
 *
 * Der Cache haelt die Referenz stabil — ohne ihn wuerde jedes
 * JSON.parse ein neues Objekt liefern und React endlos neu rendern.
 */
const cache = new Map<string, { raw: string | null; value: unknown }>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function snapshot<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;

  let value: unknown = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value as T;
}

function emit(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

let storageListenerAttached = false;

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  if (!storageListenerAttached && typeof window !== "undefined") {
    storageListenerAttached = true;
    window.addEventListener("storage", (event) => {
      if (!event.key?.startsWith(PREFIX)) return;
      const plain = event.key.slice(PREFIX.length);
      cache.delete(plain);
      emit(plain);
    });
  }

  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder privater Modus — der Wert gilt trotzdem
       fuer diese Sitzung, damit das Tool benutzbar bleibt. */
  }
  cache.set(key, { raw: readRaw(key), value });
  emit(key);
}

export function useStored<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(key, listener), [key]),
    () => snapshot(key, initial),
    () => initial,
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(snapshot(key, initial))
          : next;
      write(key, resolved);
    },
    // `initial` dient nur als Rueckfallwert, wenn noch nichts gespeichert
    // ist — es darf die Identitaet der Funktion nicht veraendern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, setValue];
}

/** true, sobald der Browser uebernommen hat — vorher gilt die Server-Ausgabe. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
