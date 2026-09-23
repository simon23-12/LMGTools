import { aufraeumen } from "@/lib/blaetter-server";

/**
 * Taeglicher Cron (vercel.json). Faengt Blaetter ab, nach denen kein
 * weiterer Upload mehr kam, der sie mitgenommen haette.
 */
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (geheim && request.headers.get("authorization") !== `Bearer ${geheim}`) {
    return new Response("Nicht erlaubt", { status: 401 });
  }
  return Response.json(await aufraeumen());
}
