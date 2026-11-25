import { del, head, list } from "@vercel/blob";
import {
  ERLAUBTE_TYPEN,
  MAX_BYTES_PRO_PLATZ,
  MAX_BYTES_PRO_WAND,
  MAX_DATEIEN_PRO_PLATZ,
  MAX_PLAETZE,
  PREFIX,
  belegt,
  belegtWand,
  istId,
  teileAusPfad,
  zufallsId,
  type Platz,
  type WandAenderung,
} from "@/lib/galerie";
import {
  Abgelehnt,
  aendereWand,
  fehlerAntwort,
  ladeWand,
  oeffentlich,
  pruefeSchluessel,
  loescheWandListe,
  sha256,
  wandEtag,
} from "@/lib/galerie-server";

/**
 * Eine Wand: lesen (alle), Plaetze aendern und loeschen (nur Lehrkraft),
 * Dateien eintragen und austragen.
 */

async function wandId(ctx: RouteContext<"/api/galerie/[id]">) {
  const { id } = await ctx.params;
  if (!istId(id)) throw new Abgelehnt("Diese Wand gibt es nicht.", 404);
  return id;
}

/**
 * Wird alle paar Sekunden von der Beamer-Ansicht abgefragt. Mit
 * If-None-Match kommt nur 304 zurueck, solange sich nichts getan hat.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/galerie/[id]">) {
  try {
    const id = await wandId(ctx);
    const bekannt = request.headers.get("if-none-match")?.replace(/^W\//, "");
    // Erst nur das ETag — unveraendert wird gar nichts geladen.
    const etag = await wandEtag(id);
    if (!etag) throw new Abgelehnt("Diese Wand gibt es nicht.", 404);
    if (bekannt === etag) {
      return new Response(null, {
        status: 304,
        headers: { etag, "cache-control": "no-store" },
      });
    }
    const geladen = await ladeWand(id);
    if (!geladen) throw new Abgelehnt("Diese Wand gibt es nicht.", 404);
    return Response.json(oeffentlich(geladen.wand), {
      headers: { etag: geladen.etag, "cache-control": "no-store" },
    });
  } catch (fehler) {
    return fehlerAntwort(fehler);
  }
}

/**
 * Lehrkraft: einzelne Aenderungen an Titel und Plaetzen. Bewusst keine
 * ganze Liste — sonst ueberschreiben sich zwei schnelle Aenderungen
 * gegenseitig. Plaetze, die wegfallen, verlieren ihre Dateien.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/galerie/[id]">) {
  try {
    const id = await wandId(ctx);
    const body = (await request.json()) as WandAenderung;
    const name = (n: unknown) => (typeof n === "string" ? n.trim().slice(0, 40) : "");
    let weg: string[] = [];

    const wand = await aendereWand(id, async (wand) => {
      await pruefeSchluessel(wand, request);
      weg = [];
      if (typeof body.titel === "string") wand.titel = body.titel.trim().slice(0, 80) || "Galerie";

      if (body.umbenennen) {
        const platz = wand.plaetze.find((p) => p.id === body.umbenennen?.id);
        if (platz) platz.name = name(body.umbenennen.name);
      }

      if (body.platzDazu) {
        if (wand.plaetze.length >= MAX_PLAETZE) throw new Abgelehnt(`Höchstens ${MAX_PLAETZE} Plätze.`);
        wand.plaetze.push({ id: zufallsId(6), name: "", dateien: [] });
      }

      let neu: Platz[] = wand.plaetze;
      if (typeof body.platzWeg === "string") {
        neu = neu.filter((p) => p.id !== body.platzWeg);
      }
      if (Array.isArray(body.namen)) {
        const namen = body.namen.slice(0, MAX_PLAETZE).map(name);
        if (namen.length === 0) throw new Abgelehnt("Der Kurs ist leer.");
        neu = namen.map((n, i) =>
          neu[i] ? { ...neu[i], name: n } : { id: zufallsId(6), name: n, dateien: [] },
        );
      }
      if (neu.length === 0) throw new Abgelehnt("Mindestens ein Platz muss bleiben.");
      const bleibt = new Set(neu.map((p) => p.id));
      weg = wand.plaetze.filter((p) => !bleibt.has(p.id)).flatMap((p) => p.dateien.map((d) => d.url));
      for (const url of weg) delete wand.loeschHashes[url];
      wand.plaetze = neu;
    });

    if (weg.length > 0) await del(weg);
    return Response.json(oeffentlich(wand));
  } catch (fehler) {
    return fehlerAntwort(fehler);
  }
}

/** Lehrkraft: ganze Wand samt Dateien loeschen. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/galerie/[id]">) {
  try {
    const id = await wandId(ctx);
    const geladen = await ladeWand(id);
    if (!geladen) return Response.json({ ok: true });
    await pruefeSchluessel(geladen.wand, request);

    // Dateien im oeffentlichen Store — list() erwischt auch solche,
    // die nie eingetragen wurden.
    let cursor: string | undefined;
    do {
      const seite = await list({ prefix: `${PREFIX}${id}/`, cursor, limit: 1000 });
      if (seite.blobs.length > 0) await del(seite.blobs.map((b) => b.url));
      cursor = seite.hasMore ? seite.cursor : undefined;
    } while (cursor);
    await loescheWandListe(id);
    return Response.json({ ok: true });
  } catch (fehler) {
    return fehlerAntwort(fehler);
  }
}

type DateiAktion =
  | { aktion: "eintragen"; url: string; name: string; loeschHash: string }
  | { aktion: "loeschen"; url: string; token?: string };

/**
 * Nach dem Upload traegt das iPad seine Datei in die Wand ein. Groesse und
 * Typ kommen nicht vom iPad, sondern vom Store selbst (head).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/galerie/[id]">) {
  try {
    const id = await wandId(ctx);
    const body = (await request.json()) as DateiAktion;
    if (typeof body.url !== "string") throw new Abgelehnt("Ungültige Datei.");
    const pfad = new URL(body.url).pathname;
    const teile = teileAusPfad(pfad);
    if (!teile || teile.wand !== id) throw new Abgelehnt("Datei gehört nicht zu dieser Wand.");

    if (body.aktion === "eintragen") {
      if (typeof body.loeschHash !== "string" || !/^[0-9a-f]{64}$/.test(body.loeschHash)) {
        throw new Abgelehnt("Ungültige Datei.");
      }
      const info = await head(body.url);
      const name = typeof body.name === "string" ? body.name.slice(0, 80) : "Datei";

      let zuViel = false;
      const wand = await aendereWand(id, (wand) => {
        const platz = wand.plaetze.find((p) => p.id === teile.platz);
        if (!platz) throw new Abgelehnt("Diesen Platz gibt es nicht mehr.", 404);
        if (platz.dateien.some((d) => d.url === body.url)) return;
        zuViel =
          !ERLAUBTE_TYPEN.includes(info.contentType) ||
          platz.dateien.length >= MAX_DATEIEN_PRO_PLATZ ||
          belegt(platz) + info.size > MAX_BYTES_PRO_PLATZ ||
          belegtWand(wand) + info.size > MAX_BYTES_PRO_WAND;
        if (zuViel) return;
        platz.dateien.push({
          url: body.url,
          name,
          typ: info.contentType,
          bytes: info.size,
          zeit: Date.now(),
        });
        wand.loeschHashes[body.url] = body.loeschHash;
      });

      if (zuViel) {
        // Zwei iPads gleichzeitig am selben Platz koennen zusammen ueber
        // die Grenze kommen — die zweite Datei fliegt dann wieder raus.
        await del(body.url);
        throw new Abgelehnt("Auf diesem Platz ist kein Platz mehr frei.", 409);
      }
      return Response.json(oeffentlich(wand));
    }

    if (body.aktion === "loeschen") {
      const wand = await aendereWand(id, async (wand) => {
        const hash = wand.loeschHashes[body.url];
        const vomIpad =
          typeof body.token === "string" && hash !== undefined && (await sha256(body.token)) === hash;
        if (!vomIpad) await pruefeSchluessel(wand, request);
        for (const platz of wand.plaetze) {
          platz.dateien = platz.dateien.filter((d) => d.url !== body.url);
        }
        delete wand.loeschHashes[body.url];
      });
      await del(body.url);
      return Response.json(oeffentlich(wand));
    }

    throw new Abgelehnt("Unbekannte Aktion.");
  } catch (fehler) {
    return fehlerAntwort(fehler);
  }
}
