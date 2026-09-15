"use client";

import { useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Kbd } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";

type PhaseId = "einzel" | "partner" | "gruppe" | "plenum";

type Phase = {
  id: PhaseId;
  name: string;
  lautstaerke: string;
  hilfe: string;
  farbe: string;
  koepfe: number;
};

const PHASEN: Phase[] = [
  {
    id: "einzel",
    name: "Einzelarbeit",
    lautstaerke: "Still",
    hilfe: "Melden — ich komme zu dir",
    farbe: "var(--a-blue)",
    koepfe: 1,
  },
  {
    id: "partner",
    name: "Partnerarbeit",
    lautstaerke: "Flüsterton",
    hilfe: "Erst den Partner fragen",
    farbe: "var(--a-teal)",
    koepfe: 2,
  },
  {
    id: "gruppe",
    name: "Gruppenarbeit",
    lautstaerke: "Zimmerlautstärke",
    hilfe: "Erst die Gruppe, dann ich",
    farbe: "var(--a-orange)",
    koepfe: 3,
  },
  {
    id: "plenum",
    name: "Plenum",
    lautstaerke: "Eine Person spricht",
    hilfe: "Melden und abwarten",
    farbe: "var(--a-violet)",
    koepfe: 4,
  },
];

export default function PhasenPage() {
  const [aktiv, setAktiv] = useStored<PhaseId>("phasen.aktiv", "einzel");
  const [auftrag, setAuftrag] = useStored("phasen.auftrag", "");
  const [bearbeiten, setBearbeiten] = useState(false);

  const phase = PHASEN.find((p) => p.id === aktiv) ?? PHASEN[0];

  useHotkeys({
    "1": () => setAktiv("einzel"),
    "2": () => setAktiv("partner"),
    "3": () => setAktiv("gruppe"),
    "4": () => setAktiv("plenum"),
  });

  return (
    <ToolShell
      slug="phasen"
      bleed
      hint={
        <>
          <Kbd>1</Kbd>–<Kbd>4</Kbd> umschalten
        </>
      }
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center transition-colors duration-500"
        style={{
          background: `color-mix(in srgb, ${phase.farbe} 8%, transparent)`,
        }}
      >
        <Koepfe anzahl={phase.koepfe} farbe={phase.farbe} />

        <h2
          className="font-display leading-none font-extrabold"
          style={{
            color: phase.farbe,
            fontSize: "clamp(2.75rem, 10vw, 8rem)",
            letterSpacing: "-0.035em",
          }}
        >
          {phase.name}
        </h2>

        {auftrag ? (
          <p
            className="max-w-5xl font-display leading-tight font-bold text-balance"
            style={{ fontSize: "clamp(1.35rem, 3.4vw, 2.75rem)" }}
          >
            {auftrag}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          <Chip label="Lautstärke" wert={phase.lautstaerke} farbe={phase.farbe} />
          <Chip label="Hilfe" wert={phase.hilfe} farbe={phase.farbe} />
        </div>
      </div>

      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-2.5 px-5 py-4">
          {PHASEN.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAktiv(p.id)}
              className={`inline-flex h-12 items-center gap-2.5 rounded-xl border px-4 text-[0.95rem] font-semibold transition ${
                p.id === aktiv
                  ? "border-transparent text-white"
                  : "border-line text-muted hover:text-ink"
              }`}
              style={p.id === aktiv ? { background: p.farbe } : undefined}
            >
              <span
                className={`grid size-6 place-items-center rounded-md text-[0.7rem] font-bold ${
                  p.id === aktiv ? "bg-white/25" : "bg-surface-2"
                }`}
              >
                {i + 1}
              </span>
              {p.name}
            </button>
          ))}

          <Button
            variant="ghost"
            icon="pen"
            onClick={() => setBearbeiten((b) => !b)}
          >
            Arbeitsauftrag
          </Button>
        </div>

        {bearbeiten ? (
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-5">
            <div className="flex flex-wrap gap-2.5">
              <input
                value={auftrag}
                onChange={(e) => setAuftrag(e.target.value)}
                placeholder="z. B. S. 48, Nr. 3 bis 5 — Ergebnisse ins Heft"
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-[1rem] outline-none"
                aria-label="Arbeitsauftrag"
                autoFocus
              />
              <Button variant="outline" onClick={() => setAuftrag("")}>
                Leeren
              </Button>
              <Button variant="primary" onClick={() => setBearbeiten(false)}>
                Fertig
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}

function Chip({
  label,
  wert,
  farbe,
}: {
  label: string;
  wert: string;
  farbe: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2.5 rounded-2xl border border-line bg-surface px-5 py-3 shadow-[var(--shadow-sm)]">
      <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">
        {label}
      </span>
      <span
        className="font-display text-[1.15rem] font-bold sm:text-[1.4rem]"
        style={{ color: farbe }}
      >
        {wert}
      </span>
    </span>
  );
}

/** So viele Köpfe wie Personen in der Sozialform — auch von hinten lesbar. */
function Koepfe({ anzahl, farbe }: { anzahl: number; farbe: string }) {
  const sichtbar = Math.min(anzahl, 4);
  return (
    <div className="flex items-end gap-3">
      {Array.from({ length: sichtbar }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 40 48"
          className="h-[clamp(3.5rem,11vh,7rem)] w-auto"
          style={{ color: farbe, opacity: 0.9 }}
          aria-hidden="true"
        >
          <circle cx="20" cy="13" r="10" fill="currentColor" />
          <path
            d="M2 48c0-10.5 8-18 18-18s18 7.5 18 18z"
            fill="currentColor"
          />
        </svg>
      ))}
      {anzahl > 4 ? (
        <span
          className="pb-2 font-display text-4xl font-extrabold"
          style={{ color: farbe }}
        >
          …
        </span>
      ) : null}
    </div>
  );
}
