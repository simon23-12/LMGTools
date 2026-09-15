import type { MetadataRoute } from "next";

/* Im Manifest muss der Basispfad von Hand davor — anders als bei
   next/link ergaenzt Next ihn hier nicht automatisch. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* Bei `output: "export"` muessen Metadata-Routen ausdruecklich als
   statisch markiert werden, sonst bricht der Build ab. */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LMG Classroom Tools",
    short_name: "LMG Tools",
    description:
      "Werkzeuge für den Unterricht am LMG — Timer, Ampel, Gruppen, Sitzplan.",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#2c5aa0",
    lang: "de",
    icons: [
      {
        src: `${basePath}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
