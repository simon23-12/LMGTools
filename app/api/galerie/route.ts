import {
  MAX_PLAETZE,
  MAX_WAENDE,
  geheimnis,
  zufallsId,
  type WandIntern,
} from "@/lib/galerie";
import {
  Abgelehnt,
  anzahlWaende,
  fehlerAntwort,
  oeffentlich,
  sha256,
  speichereWand,
} from "@/lib/galerie-server";

/**
 * Legt eine neue Wand an. Zurueck kommt der Schluessel der Lehrkraft —
 * er steht danach nur im Browser, der die Wand angelegt hat.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { titel?: unknown; namen?: unknown };
    const titel = typeof body.titel === "string" ? body.titel.trim().slice(0, 80) : "";
    const namen = Array.isArray(body.namen)
      ? body.namen.map((n) => (typeof n === "string" ? n.trim().slice(0, 40) : ""))
      : [];
    if (namen.length < 1 || namen.length > MAX_PLAETZE) {
      throw new Abgelehnt(`Zwischen 1 und ${MAX_PLAETZE} Plätze.`);
    }

    // Ein list() pro neuer Wand — teuer, aber selten.
    if ((await anzahlWaende()) >= MAX_WAENDE) {
      throw new Abgelehnt(
        `Es gibt schon ${MAX_WAENDE} Wände. Erst eine löschen, dann ist wieder Platz.`,
        409,
      );
    }

    const schluessel = geheimnis();
    const wand: WandIntern = {
      id: zufallsId(),
      titel: titel || "Galerie",
      erstellt: Date.now(),
      plaetze: namen.map((name) => ({ id: zufallsId(6), name, dateien: [] })),
      schluesselHash: await sha256(schluessel),
      loeschHashes: {},
    };
    await speichereWand(wand);
    return Response.json({ wand: oeffentlich(wand), schluessel });
  } catch (fehler) {
    return fehlerAntwort(fehler);
  }
}
