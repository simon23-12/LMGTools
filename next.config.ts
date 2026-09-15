import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ohne das sucht Turbopack die package-lock.json im Heimatverzeichnis
  // und waehlt einen zu hohen Projekt-Root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
