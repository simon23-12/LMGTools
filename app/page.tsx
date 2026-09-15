"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { LmgLogo } from "@/components/Logo";
import { ThemeToggle } from "@/components/Theme";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import {
  CATEGORY_BLURB,
  CATEGORY_ORDER,
  TOOLS,
  type Tool,
} from "@/lib/tools";

export default function Home() {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useStored<string[]>("favorites.v1", []);
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkeys({
    "/": () => searchRef.current?.focus(),
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOLS;
    return TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [query]);

  function toggleFavorite(slug: string) {
    setFavorites((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  const favoriteTools = TOOLS.filter((t) => favorites.includes(t.slug));
  const searching = query.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-20 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-6">
        <LmgLogo />
        <div className="flex items-center gap-1">
          <a
            href="https://lmg-duesseldorf.de"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink sm:block"
          >
            Schulseite
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* ---------------- Titelbereich ---------------- */}
      <section className="relative overflow-hidden pt-6 pb-10 sm:pt-12 sm:pb-14">
        <p
          className="mb-3 text-[0.8rem] font-bold tracking-[0.14em] uppercase"
          style={{ color: "var(--lmg-orange)" }}
        >
          Lessing-Gymnasium
        </p>
        <h1 className="max-w-3xl font-display text-[2.6rem] leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
          Werkzeuge für
          <br />
          <span style={{ color: "var(--lmg-blue)" }}>den Unterricht.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Timer, Ampel, Gruppen, Sitzplan — auf den Beamer gedacht, in einem
          Klick offen. Ohne Anmeldung, ohne Server, ohne Schülerdaten im Netz.
        </p>

        <div className="mt-8 flex max-w-md items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 shadow-[var(--shadow-sm)] focus-within:border-transparent focus-within:ring-2 focus-within:ring-[var(--lmg-blue)]">
          <Icon name="search" size={19} className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Werkzeug suchen …"
            className="h-13 w-full bg-transparent py-3.5 text-[1rem] outline-none placeholder:text-muted/70"
            aria-label="Werkzeug suchen"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 rounded-lg p-1 text-muted hover:text-ink"
              aria-label="Suche leeren"
            >
              <Icon name="x" size={17} />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted sm:block">
              /
            </kbd>
          )}
        </div>
      </section>

      {/* ---------------- Favoriten ---------------- */}
      {!searching && favoriteTools.length > 0 ? (
        <Group
          title="Deine Favoriten"
          blurb="Mit dem Stern auf einer Kachel"
          tools={favoriteTools}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}

      {/* ---------------- Kacheln ---------------- */}
      {searching ? (
        matches.length > 0 ? (
          <Group
            title={`${matches.length} Treffer`}
            tools={matches}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <p className="py-16 text-center text-muted">
            Nichts gefunden für „{query}“.
          </p>
        )
      ) : (
        CATEGORY_ORDER.map((cat) => (
          <Group
            key={cat}
            title={cat}
            blurb={CATEGORY_BLURB[cat]}
            tools={TOOLS.filter((t) => t.category === cat)}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        ))
      )}

      <footer className="mt-20 border-t border-line pt-8 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-lg text-sm leading-relaxed text-muted">
            <strong className="font-semibold text-ink">
              Alles bleibt auf diesem Gerät.
            </strong>{" "}
            Klassenlisten, Sitzpläne und Einstellungen liegen im lokalen
            Speicher des Browsers. Es gibt keine Anmeldung, keine Datenbank und
            keine Übertragung an Dritte.
          </p>
          <p className="text-sm text-muted">
            Für das Kollegium des Lessing-Gymnasiums.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Group({
  title,
  blurb,
  tools,
  favorites,
  onToggleFavorite,
}: {
  title: string;
  blurb?: string;
  tools: Tool[];
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
}) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {blurb ? <span className="text-sm text-muted">{blurb}</span> : null}
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard
            key={tool.slug}
            tool={tool}
            isFavorite={favorites.includes(tool.slug)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
}: {
  tool: Tool;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
}) {
  return (
    <div className="group relative">
      <Link
        href={`/${tool.slug}`}
        className="flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tool-accent)_45%,transparent)] hover:shadow-[var(--shadow-md)]"
        style={{ ["--tool-accent" as string]: tool.accent }}
      >
        {/* Sprechblasen-Anmutung: eine Ecke bleibt eckig */}
        <span
          className="grid size-12 shrink-0 place-items-center rounded-[1.15rem] rounded-bl-[0.4rem] transition group-hover:scale-105"
          style={{
            background: `color-mix(in srgb, ${tool.accent} 14%, transparent)`,
            color: tool.accent,
          }}
        >
          <Icon name={tool.icon} size={24} />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="block font-display text-[1.05rem] leading-tight font-bold">
            {tool.name}
          </span>
          <span className="mt-1 block text-[0.9rem] leading-snug text-muted">
            {tool.tagline}
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => onToggleFavorite(tool.slug)}
        className={`absolute top-3.5 right-3.5 rounded-lg p-1.5 transition ${
          isFavorite
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        }`}
        style={{ color: isFavorite ? "var(--lmg-orange)" : "var(--ink-muted)" }}
        aria-label={
          isFavorite ? `${tool.name} aus Favoriten entfernen` : `${tool.name} zu Favoriten`
        }
        title={isFavorite ? "Favorit entfernen" : "Als Favorit merken"}
      >
        <Icon name="star" size={16} />
      </button>
    </div>
  );
}
