import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  del,
  get,
  head,
  list,
  put,
} from "@vercel/blob";
import { PREFIX, wandPfad, type Wand, type WandIntern } from "./galerie";
import { sha256Browser } from "./galerie-hash";

/**
 * Lesen und Schreiben der Inhaltsliste einer Wand.
 *
 * Die Listen liegen in einem eigenen, privaten Store (lmg-galerie): Nur
 * dort liest Vercel Blob garantiert frisch am CDN vorbei, und die Namen
 * sind nicht oeffentlich abrufbar. Die Dateien selbst liegen im
 * oeffentlichen Store der Arbeitsblaetter.
 *
 * Wenn 30 iPads gleichzeitig hochladen, wollen alle zugleich die Liste
 * aendern. Darum wird nur geschrieben, wenn sie seit dem Lesen niemand
 * veraendert hat (ETag); sonst neu lesen und noch einmal versuchen.
 */

export { sha256Browser as sha256 } from "./galerie-hash";

function token(): string {
  const wert = process.env.GALERIE_READ_WRITE_TOKEN;
  if (!wert) throw new Error("GALERIE_READ_WRITE_TOKEN fehlt");
  return wert;
}

/** Aktuelles ETag der Wand, oder null, wenn es sie nicht gibt. */
export async function wandEtag(id: string): Promise<string | null> {
  try {
    return (await head(wandPfad(id), { token: token() })).etag;
  } catch (fehler) {
    if (fehler instanceof BlobNotFoundError) return null;
    throw fehler;
  }
}

export async function ladeWand(
  id: string,
): Promise<{ wand: WandIntern; etag: string } | null> {
  const antwort = await get(wandPfad(id), { access: "private", useCache: false, token: token() });
  if (!antwort || antwort.statusCode !== 200) return null;
  const wand = (await new Response(antwort.stream).json()) as WandIntern;
  // Komprimiert ausgelieferte Antworten tragen ein schwaches ETag (W/"…"),
  // ifMatch braucht aber das starke.
  return { wand, etag: antwort.blob.etag.replace(/^W\//, "") };
}

export async function speichereWand(wand: WandIntern, etag?: string) {
  await put(wandPfad(wand.id), JSON.stringify(wand), {
    access: "private",
    token: token(),
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

/** Wie viele Waende es gibt — ein list(), darum nur beim Anlegen. */
export async function anzahlWaende(): Promise<number> {
  const seite = await list({ prefix: PREFIX, mode: "folded", token: token() });
  return seite.folders.length;
}

export async function loescheWandListe(id: string) {
  await del(wandPfad(id), { token: token() });
}

export class Abgelehnt extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/**
 * Liest, wendet die Aenderung an und schreibt — bei gleichzeitigen
 * Aenderungen bis zu 20 Mal mit zufaelliger Pause, damit nicht alle im
 * selben Takt erneut zugreifen. Die Aenderung darf Abgelehnt werfen.
 */
export async function aendereWand(
  id: string,
  aenderung: (wand: WandIntern) => void | Promise<void>,
): Promise<WandIntern> {
  for (let versuch = 0; versuch < 20; versuch++) {
    const geladen = await ladeWand(id);
    if (!geladen) throw new Abgelehnt("Diese Wand gibt es nicht.", 404);
    await aenderung(geladen.wand);
    try {
      await speichereWand(geladen.wand, geladen.etag);
      return geladen.wand;
    } catch (fehler) {
      if (!(fehler instanceof BlobPreconditionFailedError)) throw fehler;
      const pause = 50 + Math.random() * Math.min(1500, 150 * (versuch + 1));
      await new Promise((r) => setTimeout(r, pause));
    }
  }
  throw new Abgelehnt("Gerade zu viel los — bitte gleich noch einmal.", 503);
}

/** Ohne die Hashes — so geht die Wand an den Browser. */
export function oeffentlich(wand: WandIntern): Wand {
  return {
    id: wand.id,
    titel: wand.titel,
    erstellt: wand.erstellt,
    plaetze: wand.plaetze,
  };
}

export async function pruefeSchluessel(wand: WandIntern, request: Request) {
  const schluessel = request.headers.get("x-schluessel") ?? "";
  if (!schluessel || (await sha256Browser(schluessel)) !== wand.schluesselHash) {
    throw new Abgelehnt("Nur die Lehrkraft darf das.", 403);
  }
}

export function fehlerAntwort(fehler: unknown) {
  if (fehler instanceof Abgelehnt) {
    return Response.json({ error: fehler.message }, { status: fehler.status });
  }
  console.error(fehler);
  return Response.json({ error: "Da ist etwas schiefgegangen." }, { status: 500 });
}
