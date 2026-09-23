import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  ERLAUBTE_TYPEN,
  MAX_BYTES,
  MAX_GLEICHZEITIG,
  zeitpunktAusPfad,
} from "@/lib/blaetter";
import { aufraeumen } from "@/lib/blaetter-server";

/**
 * Gibt einen Upload direkt vom Browser zu Vercel Blob frei. Die Datei
 * selbst laeuft nicht durch diese Funktion — nur die Erlaubnis dafuer.
 *
 * Es gibt kein Passwort. Damit niemand den Speicher vollmacht, liegen
 * hoechstens MAX_GLEICHZEITIG gueltige Blaetter gleichzeitig im Store,
 * jedes hoechstens 25 MB.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const antwort = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pfad) => {
        // Der Zeitstempel im Pfad entscheidet ueber den Ablauf. Eine
        // falsch gehende Uhr am Lehrerrechner darf ihn nicht verschieben.
        const zeit = zeitpunktAusPfad(pfad);
        if (zeit === null || Math.abs(zeit - Date.now()) > 10 * 60 * 1000) {
          throw new Error("Ungültiger Pfad oder falsche Uhrzeit");
        }

        // Jeder Upload raeumt Abgelaufenes weg — so bleibt der Speicher
        // auch ohne haeufigen Cron klein.
        const { aktiv } = await aufraeumen();
        if (aktiv >= MAX_GLEICHZEITIG) {
          throw new Error("Speicher voll");
        }

        return {
          allowedContentTypes: ERLAUBTE_TYPEN,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(antwort);
  } catch (fehler) {
    const nachricht =
      fehler instanceof Error ? fehler.message : "Upload fehlgeschlagen";
    return Response.json({ error: nachricht }, { status: 400 });
  }
}
