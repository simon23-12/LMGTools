import type { NextConfig } from "next";

/**
 * Laeuft auf Vercel. Fast alles wird weiterhin statisch vorgerendert;
 * nur die Arbeitsblaetter (/blaetter) brauchen ein paar Route Handler,
 * die Uploads freigeben und abgelaufene Dateien wegraeumen.
 */
const nextConfig: NextConfig = {
  // /timer/ statt /timer — so bleiben alte Lesezeichen gueltig.
  trailingSlash: true,

  // Ohne das sucht Turbopack die package-lock.json im Heimatverzeichnis
  // und waehlt einen zu hohen Projekt-Root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
