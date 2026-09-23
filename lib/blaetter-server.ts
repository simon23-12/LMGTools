import { del, list } from "@vercel/blob";
import { LAUFZEIT_MS, PREFIX } from "./blaetter";

/**
 * Loescht alle Blaetter, die aelter als die Laufzeit sind. Vercel Blob
 * kennt kein Ablaufdatum — Speicher wird erst frei, wenn wir loeschen.
 * Laeuft bei jedem Upload und einmal taeglich per Cron.
 *
 * Gibt zurueck, wie viele Blaetter danach noch gueltig liegen.
 */
export async function aufraeumen(): Promise<{ geloescht: number; aktiv: number }> {
  const grenze = Date.now() - LAUFZEIT_MS;
  const alt: string[] = [];
  let aktiv = 0;
  let cursor: string | undefined;
  do {
    const seite = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const blob of seite.blobs) {
      if (blob.uploadedAt.getTime() < grenze) alt.push(blob.url);
      else aktiv++;
    }
    cursor = seite.hasMore ? seite.cursor : undefined;
  } while (cursor);

  if (alt.length > 0) await del(alt);
  return { geloescht: alt.length, aktiv };
}
