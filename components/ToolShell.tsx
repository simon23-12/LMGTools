"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icons";
import { LmgMark } from "./Logo";
import { ThemeToggle } from "./Theme";
import { IconButton } from "./ui";
import { useFullscreen } from "@/lib/hooks";
import { toolBySlug } from "@/lib/tools";

/**
 * Rahmen fuer jedes Tool: Kopfzeile mit Rueckweg, Vollbild und Theme.
 *
 * Im Vollbild blendet sich die Kopfzeile nach kurzer Ruhe aus — vor der
 * Klasse soll nur das Tool zu sehen sein, nicht die Navigation.
 */
export function ToolShell({
  slug,
  children,
  hint,
  bleed = false,
}: {
  slug: string;
  children: ReactNode;
  hint?: ReactNode;
  /** true = Inhalt fuellt den Bildschirm (Timer, Ampel, Anzeige) */
  bleed?: boolean;
}) {
  const tool = toolBySlug(slug);
  const { isFullscreen, toggle } = useFullscreen();
  const [ruht, setRuht] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    let timer = window.setTimeout(() => setRuht(true), 2600);
    const wecken = () => {
      setRuht(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setRuht(true), 2600);
    };
    window.addEventListener("mousemove", wecken);
    window.addEventListener("touchstart", wecken);
    window.addEventListener("keydown", wecken);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wecken);
      window.removeEventListener("touchstart", wecken);
      window.removeEventListener("keydown", wecken);
    };
  }, [isFullscreen]);

  // Ausserhalb des Vollbilds ist die Kopfzeile immer da.
  const chromeVisible = !isFullscreen || !ruht;

  return (
    <div
      className="flex min-h-full flex-col"
      style={{ ["--accent" as string]: tool?.accent ?? "var(--lmg-blue)" }}
      data-stage={isFullscreen ? "on" : "off"}
    >
      <header
        className={`sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-md transition-opacity duration-500 ${
          chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="Zur Übersicht"
            title="Zur Übersicht"
          >
            <Icon name="back" size={20} />
          </Link>

          <Link href="/" className="hidden shrink-0 sm:block" aria-label="LMG">
            <LmgMark size={26} />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold">
              {tool?.name ?? "Werkzeug"}
            </h1>
          </div>

          {hint ? (
            <div className="mr-1 hidden items-center gap-2 text-[0.8rem] text-muted lg:flex">
              {hint}
            </div>
          ) : null}

          <ThemeToggle />
          <IconButton
            icon={isFullscreen ? "collapse" : "expand"}
            label={isFullscreen ? "Vollbild beenden" : "Vollbild"}
            onClick={() => void toggle()}
          />
        </div>
      </header>

      <main
        className={
          bleed
            ? "flex flex-1 flex-col"
            : "mx-auto w-full max-w-[1500px] flex-1 px-4 py-7 sm:px-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
