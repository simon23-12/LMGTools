import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ERLAUBTE_TYPEN,
  MAX_BYTES_PRO_PLATZ,
  MAX_BYTES_PRO_WAND,
  MAX_DATEIEN_PRO_PLATZ,
  belegt,
  belegtWand,
  teileAusPfad,
} from "@/lib/galerie";
import { Abgelehnt, ladeWand } from "@/lib/galerie-server";

/**
 * Gibt einen Upload vom iPad direkt zu Vercel Blob frei. Die Datei
 * laeuft nicht durch diese Funktion. Die Erlaubnis gilt nur fuer so
 * viele Bytes, wie auf dem Platz noch frei sind.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const antwort = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pfad) => {
        const teile = teileAusPfad(pfad);
        if (!teile) throw new Abgelehnt("Ungültiger Pfad");
        const geladen = await ladeWand(teile.wand);
        if (!geladen) throw new Abgelehnt("Diese Wand gibt es nicht mehr");
        const platz = geladen.wand.plaetze.find((p) => p.id === teile.platz);
        if (!platz) throw new Abgelehnt("Diesen Platz gibt es nicht mehr");
        if (platz.dateien.length >= MAX_DATEIEN_PRO_PLATZ) {
          throw new Abgelehnt(`Höchstens ${MAX_DATEIEN_PRO_PLATZ} Dateien pro Platz`);
        }
        const frei = Math.min(
          MAX_BYTES_PRO_PLATZ - belegt(platz),
          MAX_BYTES_PRO_WAND - belegtWand(geladen.wand),
        );
        if (frei < 50 * 1024) throw new Abgelehnt("Kein Platz mehr frei");

        return {
          allowedContentTypes: ERLAUBTE_TYPEN,
          maximumSizeInBytes: frei,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(antwort);
  } catch (fehler) {
    const nachricht = fehler instanceof Error ? fehler.message : "Upload fehlgeschlagen";
    return Response.json({ error: nachricht }, { status: 400 });
  }
}
