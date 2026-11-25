/**
 * Galerie — eine Wand mit bis zu 32 Plaetzen, auf die Schuelerinnen und
 * Schueler Bilder oder PDFs ablegen. Regeln, die Seite und Server teilen.
 *
 * Im Blob-Store liegt je Wand:
 *   galerie/<wand>/wand.json             Inhaltsliste (Titel, Plaetze, Dateien)
 *   galerie/<wand>/<platz>/<datei>       die Dateien selbst
 *
 * Die Inhaltsliste ist die einzige Stelle, die Seiten abfragen. So kostet
 * ein Blick auf die Wand eine einfache Operation statt eines teuren list().
 */

export const MAX_PLAETZE = 32;
export const MAX_DATEIEN_PRO_PLATZ = 10;
export const MAX_BYTES_PRO_PLATZ = 10 * 1024 * 1024;
/** Obergrenze je Wand — Bilder werden vorher verkleinert, real sind es viel weniger. */
export const MAX_BYTES_PRO_WAND = 200 * 1024 * 1024;
/**
 * Hoechstens so viele Waende gleichzeitig im Store. 4 x 200 MB bleibt
 * unter 1 GB — wird das Limit des Free-Tiers gerissen, sperrt Vercel den
 * Blob-Store 30 Tage lang, und dann gehen auch die Arbeitsblaetter nicht.
 */
export const MAX_WAENDE = 4;
export const PREFIX = "galerie/";

export const ERLAUBTE_TYPEN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/gif",
];

export type Datei = {
  url: string;
  name: string;
  typ: string;
  bytes: number;
  zeit: number;
};

export type Platz = {
  id: string;
  name: string;
  dateien: Datei[];
};

export type Wand = {
  id: string;
  titel: string;
  erstellt: number;
  plaetze: Platz[];
};

/** So liegt die Wand im Store — mit den Hashes, die nie zum Browser gehen. */
export type WandIntern = Wand & {
  schluesselHash: string;
  /** url -> Hash des Loesch-Tokens, das nur das hochladende iPad kennt */
  loeschHashes: Record<string, string>;
};

/** Eine Aenderung der Lehrkraft an der Wand (PATCH). */
export type WandAenderung = {
  titel?: string;
  umbenennen?: { id: string; name: string };
  platzDazu?: boolean;
  platzWeg?: string;
  /** Namen der Reihe nach auf die Plaetze legen (Kurs uebernehmen). */
  namen?: string[];
};

export function wandPfad(wand: string): string {
  return `${PREFIX}${wand}/wand.json`;
}

export function istId(wert: unknown): wert is string {
  return typeof wert === "string" && /^[a-z0-9]{4,16}$/.test(wert);
}

export function zufallsId(laenge = 10): string {
  const zeichen = "abcdefghijkmnpqrstuvwxyz23456789";
  const zahlen = crypto.getRandomValues(new Uint8Array(laenge));
  return Array.from(zahlen, (z) => zeichen[z % zeichen.length]).join("");
}

export function geheimnis(): string {
  const zahlen = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(zahlen, (z) => z.toString(16).padStart(2, "0")).join("");
}

/** Nur Zeichen, die in einer URL nichts kosten. */
export function sichererName(dateiname: string): string {
  const punkt = dateiname.lastIndexOf(".");
  const endung = punkt > 0 ? dateiname.slice(punkt + 1).toLowerCase() : "";
  const stamm = (punkt > 0 ? dateiname.slice(0, punkt) : dateiname)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${stamm || "datei"}${endung ? `.${endung.replace(/[^a-z0-9]/g, "")}` : ""}`;
}

export function dateiPfad(wand: string, platz: string, dateiname: string): string {
  return `${PREFIX}${wand}/${platz}/${sichererName(dateiname)}`;
}

/** wand und platz aus einem Datei-Pfad, oder null, wenn er nicht passt. */
export function teileAusPfad(pfad: string): { wand: string; platz: string } | null {
  const t = /^\/?galerie\/([a-z0-9]{4,16})\/([a-z0-9]{4,16})\/[a-zA-Z0-9._-]+$/.exec(pfad);
  return t ? { wand: t[1], platz: t[2] } : null;
}

export function belegt(platz: Platz): number {
  return platz.dateien.reduce((s, d) => s + d.bytes, 0);
}

export function belegtWand(wand: Wand): number {
  return wand.plaetze.reduce((s, p) => s + belegt(p), 0);
}

export function mb(bytes: number): string {
  const wert = bytes / (1024 * 1024);
  return `${wert < 10 ? wert.toFixed(1).replace(".", ",") : Math.round(wert)} MB`;
}

export function istBild(typ: string): boolean {
  return typ.startsWith("image/") && typ !== "image/heic";
}

export function abgabeLink(origin: string, wand: string): string {
  return `${origin}/abgabe/?w=${wand}`;
}
