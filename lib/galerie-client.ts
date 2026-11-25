"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Wand } from "./galerie";

/** Fehlermeldung des Servers, sonst ein allgemeiner Satz. */
export async function antwortOderFehler<T>(antwort: Response): Promise<T> {
  if (antwort.ok) return (await antwort.json()) as T;
  let text = "Da ist etwas schiefgegangen.";
  try {
    const daten = (await antwort.json()) as { error?: string };
    if (daten.error) text = daten.error;
  } catch {
    /* kein JSON */
  }
  throw new Error(text);
}

/**
 * Haelt die Wand aktuell. Fragt nur, solange der Tab sichtbar ist, und
 * schickt das letzte ETag mit — unveraendert kommt nur 304 zurueck.
 */
export function useWand(id: string | null, intervallMs: number) {
  // Gehoert der Stand zu einer anderen Wand, gilt er als leer.
  const [stand, setStand] = useState<{ id: string; wand: Wand | null; fehler: string | null }>({
    id: "",
    wand: null,
    fehler: null,
  });
  const etag = useRef<{ id: string; wert: string } | null>(null);
  const wand = stand.id === id ? stand.wand : null;
  const fehler = stand.id === id ? stand.fehler : null;

  useEffect(() => {
    if (!id) return;
    const wandId: string = id;
    let aus = false;
    const setWand = (w: Wand | null) => setStand((s) => ({ id: wandId, wand: w, fehler: s.id === wandId ? s.fehler : null }));
    const setFehler = (f: string | null) =>
      setStand((s) => ({ id: wandId, wand: s.id === wandId ? s.wand : null, fehler: f }));

    async function holen() {
      if (document.visibilityState !== "visible") return;
      try {
        const antwort = await fetch(`/api/galerie/${id}/`, {
          cache: "no-store",
          headers: etag.current?.id === id ? { "if-none-match": etag.current.wert } : {},
        });
        if (aus || antwort.status === 304) return;
        if (antwort.status === 404) {
          setFehler("Diese Wand gibt es nicht mehr.");
          setWand(null);
          return;
        }
        const neu = await antwortOderFehler<Wand>(antwort);
        const wert = antwort.headers.get("etag");
        etag.current = wert ? { id: wandId, wert } : null;
        if (!aus) setStand({ id: wandId, wand: neu, fehler: null });
      } catch {
        if (!aus) setFehler("Keine Verbindung — es wird weiter versucht.");
      }
    }

    void holen();
    const timer = window.setInterval(holen, intervallMs);
    const sichtbar = () => void holen();
    document.addEventListener("visibilitychange", sichtbar);
    return () => {
      aus = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sichtbar);
    };
  }, [id, intervallMs]);

  /** Nach eigener Aenderung: Antwort des Servers direkt uebernehmen. */
  function uebernehmen(neu: Wand) {
    etag.current = null;
    setStand({ id: neu.id, wand: neu, fehler: null });
  }

  return { wand, fehler, uebernehmen };
}

const nie = () => () => {};

/** Suchparameter und Hash der Adresse — auf dem Server leer. */
export function useAdresse(): { origin: string; search: string; hash: string } {
  const origin = useSyncExternalStore(nie, () => window.location.origin, () => "");
  const search = useSyncExternalStore(nie, () => window.location.search, () => "");
  const hash = useSyncExternalStore(nie, () => window.location.hash, () => "");
  return { origin, search, hash };
}

/**
 * Verkleinert Fotos vor dem Hochladen auf hoechstens 2400 px an der
 * langen Seite. Aus 8 MB vom iPad werden so meist 300–800 KB.
 * Klappt das Dekodieren nicht (etwa HEIC ausserhalb von Safari), geht
 * das Original hoch.
 */
export async function verkleinern(datei: File): Promise<File> {
  if (!datei.type.startsWith("image/") || datei.type === "image/gif") return datei;
  const KANTE = 2400;
  try {
    const bild = await createImageBitmap(datei);
    const faktor = Math.min(1, KANTE / Math.max(bild.width, bild.height));
    if (faktor === 1 && datei.size < 1.5 * 1024 * 1024) {
      bild.close();
      return datei;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bild.width * faktor);
    canvas.height = Math.round(bild.height * faktor);
    const ctx = canvas.getContext("2d");
    if (!ctx) return datei;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bild, 0, 0, canvas.width, canvas.height);
    bild.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= datei.size) return datei;
    const stamm = datei.name.replace(/\.[^.]+$/, "") || "bild";
    return new File([blob], `${stamm}.jpg`, { type: "image/jpeg" });
  } catch {
    return datei;
  }
}
