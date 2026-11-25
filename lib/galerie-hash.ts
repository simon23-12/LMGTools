/** SHA-256 als Hex im Browser — gleiches Ergebnis wie sha256() auf dem Server. */
export async function sha256Browser(text: string): Promise<string> {
  const daten = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(daten), (b) => b.toString(16).padStart(2, "0")).join("");
}
