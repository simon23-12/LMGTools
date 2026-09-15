export type ToolCategory = "Zeit" | "Klasse" | "Beamer" | "Organisation";

export type Tool = {
  slug: string;
  name: string;
  tagline: string;
  category: ToolCategory;
  accent: string;
  icon: string;
};

/**
 * Zentrale Registry aller Tools. Die Startseite, die Suche und die
 * Favoritenleiste lesen ausschliesslich hier.
 */
export const TOOLS: Tool[] = [
  {
    slug: "timer",
    name: "Timer",
    tagline: "Countdown, Stoppuhr, Intervall",
    category: "Zeit",
    accent: "var(--a-blue)",
    icon: "timer",
  },
  {
    slug: "stundenuhr",
    name: "Stundenuhr",
    tagline: "Wie lange dauert die Stunde noch?",
    category: "Zeit",
    accent: "var(--a-blue)",
    icon: "clock",
  },
  {
    slug: "stationen",
    name: "Stationenlauf",
    tagline: "Rotation mit Gong",
    category: "Zeit",
    accent: "var(--a-teal)",
    icon: "rotate",
  },
  {
    slug: "ampel",
    name: "Lautstärke-Ampel",
    tagline: "Hört mit und zeigt Grün, Gelb, Rot",
    category: "Klasse",
    accent: "var(--a-green)",
    icon: "traffic",
  },
  {
    slug: "phasen",
    name: "Arbeitsphase",
    tagline: "Einzel-, Partner- oder Gruppenarbeit",
    category: "Klasse",
    accent: "var(--a-orange)",
    icon: "phases",
  },
  {
    slug: "gruppen",
    name: "Gruppen",
    tagline: "Einteilen — mit Regeln und Rollen",
    category: "Klasse",
    accent: "var(--a-orange)",
    icon: "groups",
  },
  {
    slug: "mingle",
    name: "Mingle",
    tagline: "Neue Gesprächspartner im Minutentakt",
    category: "Klasse",
    accent: "var(--a-pink)",
    icon: "mingle",
  },
  {
    slug: "zufall",
    name: "Wer ist dran?",
    tagline: "Namen ziehen, ohne Wiederholung",
    category: "Klasse",
    accent: "var(--a-violet)",
    icon: "dice",
  },
  {
    slug: "anzeige",
    name: "Großanzeige",
    tagline: "Ein Satz, die ganze Wand",
    category: "Beamer",
    accent: "var(--a-blue)",
    icon: "display",
  },
  {
    slug: "tafel",
    name: "Tafel",
    tagline: "Zeichnen, abdecken, aufdecken",
    category: "Beamer",
    accent: "var(--a-violet)",
    icon: "board",
  },
  {
    slug: "sitzplan",
    name: "Sitzplan",
    tagline: "Ziehen, ablegen, auslosen",
    category: "Organisation",
    accent: "var(--a-teal)",
    icon: "seats",
  },
  {
    slug: "dienste",
    name: "Dienste",
    tagline: "Tafel, Austeilen, Lüften — rotiert",
    category: "Organisation",
    accent: "var(--a-teal)",
    icon: "broom",
  },
  {
    slug: "noten",
    name: "Notenschlüssel",
    tagline: "Punkte zu Note, NRW-Oberstufe",
    category: "Organisation",
    accent: "var(--a-slate)",
    icon: "grades",
  },
  {
    slug: "klassen",
    name: "Klassen",
    tagline: "Listen anlegen — bleibt auf diesem Gerät",
    category: "Organisation",
    accent: "var(--a-slate)",
    icon: "people",
  },
];

export const CATEGORY_ORDER: ToolCategory[] = [
  "Zeit",
  "Klasse",
  "Beamer",
  "Organisation",
];

export const CATEGORY_BLURB: Record<ToolCategory, string> = {
  Zeit: "Alles, was tickt",
  Klasse: "Wer, mit wem, wie laut",
  Beamer: "Für die Wand",
  Organisation: "Der Rest des Alltags",
};

export function toolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
