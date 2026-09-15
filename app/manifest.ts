import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LMG Classroom Tools",
    short_name: "LMG Tools",
    description:
      "Werkzeuge für den Unterricht am LMG — Timer, Ampel, Gruppen, Sitzplan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#2c5aa0",
    lang: "de",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
