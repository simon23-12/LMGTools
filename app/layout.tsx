import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { themeBootScript } from "@/components/Theme";

// Auf GitHub Pages liegt alles unter /<Repository>/ — siehe next.config.ts.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LMG Classroom Tools",
    template: "%s · LMG Classroom Tools",
  },
  description:
    "Werkzeuge für den Unterricht am LMG: Timer, Lautstärke-Ampel, Gruppeneinteilung, Sitzplan und mehr. Läuft komplett im Browser.",
  applicationName: "LMG Classroom Tools",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "LMG Tools",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1320" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${outfit.variable} ${inter.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
