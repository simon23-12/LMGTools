"use client";

import { useHydrated, useStored } from "./storage";

export type Klasse = {
  id: string;
  name: string;
  /** Bewusst nur Vornamen — es verlaesst dieses Geraet ohnehin nie. */
  students: string[];
};

export const CLASSES_KEY = "classes.v1";

export function useClasses() {
  const [classes, setClasses] = useStored<Klasse[]>(CLASSES_KEY, EMPTY);
  return { classes, setClasses, hydrated: useHydrated() };
}

/** Eine einzige leere Liste — hielte man hier ein Literal, bekaeme
 *  useSyncExternalStore bei jedem Render eine neue Referenz. */
const EMPTY: Klasse[] = [];

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** "Anna, Ben\nCem; Dilara" -> ["Anna","Ben","Cem","Dilara"] */
export function parseNames(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Fisher-Yates. Erzeugt eine neue Liste, mutiert das Original nicht. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Kuerzel fuer enge Kacheln: "Alexander" -> "Alex." */
export function shortName(name: string, max = 9): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + ".";
}
