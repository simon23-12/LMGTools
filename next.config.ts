import type { NextConfig } from "next";

/**
 * Auf GitHub Pages liegt die Seite unter /<Repository-Name>/, nicht in
 * der Wurzel. Der Basispfad kommt darum aus der Umgebung: im Workflow
 * gesetzt, lokal leer — so laeuft `npm run dev` weiterhin unter "/".
 *
 * Der Wert wird zur Bauzeit fest in die Bundles geschrieben und laesst
 * sich danach nicht mehr aendern.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Reines HTML/CSS/JS nach ./out — kein Node-Server noetig.
  output: "export",
  basePath,

  // Erzeugt /timer/index.html statt /timer.html. Statische Hoster
  // liefern damit jede Route zuverlaessig aus.
  trailingSlash: true,

  // Ohne das sucht Turbopack die package-lock.json im Heimatverzeichnis
  // und waehlt einen zu hohen Projekt-Root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
