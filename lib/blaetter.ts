/**
 * Arbeitsblaetter fuer die iPads — Regeln, die Seite und Server teilen.
 *
 * Jede Datei liegt unter blaetter/<Upload-Zeitpunkt in ms>/<Name>.
 * Der Zeitstempel im Pfad ist die einzige Quelle fuer den Ablauf: Die
 * Freigabe-Seite /blatt/ liest ihn aus der URL, ohne Vercel Blob fragen
 * zu muessen. Der Server prueft beim Hochladen, dass er stimmt.
 */

export const LAUFZEIT_MS = 90 * 60 * 1000;
export const MAX_BLAETTER = 6;
export const MAX_BYTES = 25 * 1024 * 1024;
/** Obergrenze ueber alle Geraete — bremst Missbrauch ohne Passwort. */
export const MAX_GLEICHZEITIG = 40;
export const PREFIX = "blaetter/";

export const ERLAUBTE_TYPEN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];

/** Nur Zeichen, die in URL und QR-Code nichts kosten. */
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
  return `${stamm || "blatt"}${endung ? `.${endung.replace(/[^a-z0-9]/g, "")}` : ""}`;
}

export function blattPfad(zeitpunkt: number, dateiname: string): string {
  return `${PREFIX}${zeitpunkt}/${sichererName(dateiname)}`;
}

/** Upload-Zeitpunkt aus einem Blob-Pfad, oder null, wenn er nicht passt. */
export function zeitpunktAusPfad(pfad: string): number | null {
  const treffer = /^\/?blaetter\/(\d{13})\/[^/]+$/.exec(pfad);
  return treffer ? Number(treffer[1]) : null;
}

const BLOB_HOST = ".public.blob.vercel-storage.com";

/**
 * Aus der Blob-URL wird ein kurzer Link auf /blatt/: Store-Kennung,
 * Zeitstempel und Dateiname als Pfad — kein Prozent-Kodieren, damit
 * der QR-Code grob und gut scannbar bleibt.
 */
export function freigabeLink(origin: string, blobUrl: string): string {
  const url = new URL(blobUrl);
  const store = url.hostname.slice(0, -BLOB_HOST.length);
  // pathname beginnt mit "/blaetter/" — der Rest ist "<zeit>/<datei>".
  return `${origin}/blatt/${store}/${url.pathname.slice(1 + PREFIX.length)}`;
}

/** Umkehrung von freigabeLink: die Teile hinter /blatt/ zur Blob-URL. */
export function blobUrlAusTeilen(teile: string[]): string | null {
  if (teile.length !== 3) return null;
  const [store, zeit, datei] = teile;
  if (!/^[a-z0-9]+$/i.test(store) || !/^\d{13}$/.test(zeit)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(datei)) return null;
  return `https://${store}${BLOB_HOST}/${PREFIX}${zeit}/${datei}`;
}

export function istBlobUrl(wert: string): boolean {
  try {
    const url = new URL(wert);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(BLOB_HOST) &&
      zeitpunktAusPfad(url.pathname) !== null
    );
  } catch {
    return false;
  }
}
