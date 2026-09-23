import { blobUrlAusTeilen, LAUFZEIT_MS, zeitpunktAusPfad } from "@/lib/blaetter";

/**
 * Ziel der QR-Codes. Solange das Blatt gilt, geht es weiter zur Datei;
 * danach steht hier nur noch, dass es abgelaufen ist — auch wenn die
 * Datei selbst erst beim naechsten Aufraeumen verschwindet.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/blatt/[...teile]">,
) {
  const { teile } = await ctx.params;
  const ziel = blobUrlAusTeilen(teile);
  const zeit = ziel ? zeitpunktAusPfad(new URL(ziel).pathname) : null;

  if (!ziel || zeit === null) {
    return seite("Link ungültig", "Dieser QR-Code führt zu keinem Arbeitsblatt.", 404);
  }
  if (Date.now() - zeit > LAUFZEIT_MS) {
    return seite(
      "Abgelaufen",
      "Dieses Arbeitsblatt war nur für eine Doppelstunde freigegeben.",
      410,
    );
  }
  return new Response(null, {
    status: 307,
    headers: { location: ziel, "cache-control": "no-store" },
  });
}

function seite(titel: string, text: string, status: number) {
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titel}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font:17px/1.5 system-ui,sans-serif;background:#f5f7fa;color:#1b2433}
  main{max-width:26rem;padding:2rem;text-align:center}
  h1{font-size:1.6rem;margin:0 0 .5rem;color:#2c5aa0}
  p{margin:0;color:#5b6678}
  @media (prefers-color-scheme:dark){body{background:#0d1320;color:#e6ebf3}p{color:#9aa6b8}h1{color:#7fa7e0}}
</style></head>
<body><main><h1>${titel}</h1><p>${text}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
