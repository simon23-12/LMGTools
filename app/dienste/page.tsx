"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Icon } from "@/components/Icons";
import { Button, EmptyState, Panel, Stepper } from "@/components/ui";
import { useStored } from "@/lib/storage";

const STANDARD_DIENSTE = [
  "Tafeldienst",
  "Austeilen",
  "Lüften",
  "Papierkorb",
  "Ordnungsdienst",
];

/** ISO-Kalenderwoche — bestimmt, wie weit die Rotation gewandert ist. */
function kalenderwoche(date = new Date()): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const jahresbeginn = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - jahresbeginn.getTime()) / 86400000 + 1) / 7);
}

export default function DienstePage() {
  const { classes, hydrated, klasse, names, selectedId, setSelectedId } =
    useRoster("dienste");
  const classKey = klasse?.id ?? "none";

  const [dienste, setDienste] = useStored<string[]>(
    `dienste.liste.${classKey}`,
    STANDARD_DIENSTE,
  );
  const [proDienst, setProDienst] = useStored(
    `dienste.anzahl.${classKey}`,
    1,
  );
  const [versatz, setVersatz] = useStored(`dienste.versatz.${classKey}`, 0);
  const [vorschau, setVorschau] = useState(0);
  const [bearbeiten, setBearbeiten] = useState(false);

  const woche = kalenderwoche() + vorschau;

  /**
   * Reihum: In Woche w bekommt Dienst d die Personen ab
   * (w * benötigte Plätze + d * proDienst). So wandert die ganze
   * Klasse gleichmäßig durch alle Dienste.
   */
  const zuteilung = useMemo(() => {
    if (names.length === 0) return [];
    const proRunde = dienste.length * proDienst;
    const start = ((woche + versatz) * proRunde) % names.length;
    return dienste.map((dienst, d) => ({
      dienst,
      personen: Array.from({ length: proDienst }, (_, k) => {
        const i = (start + d * proDienst + k) % names.length;
        return names[i];
      }),
    }));
  }, [names, dienste, proDienst, woche, versatz]);

  if (hydrated && classes.length === 0) {
    return (
      <ToolShell slug="dienste">
        <Panel className="mx-auto max-w-xl">
          <EmptyState icon="broom" title="Dafür braucht es eine Klassenliste">
            Erst unter <strong className="text-ink">Klassen</strong> die
            Vornamen eintragen — die Rotation ergibt sich dann von selbst.
          </EmptyState>
        </Panel>
      </ToolShell>
    );
  }

  return (
    <ToolShell slug="dienste">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ClassPicker
          classes={classes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <Stepper
          value={proDienst}
          onChange={setProDienst}
          min={1}
          max={4}
          suffix="pro Dienst"
        />
        <div className="inline-flex h-11 items-center gap-1 rounded-xl border border-line bg-surface-2 px-1">
          <button
            type="button"
            onClick={() => setVorschau((v) => v - 1)}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            aria-label="Woche zurück"
          >
            <Icon name="back" size={17} />
          </button>
          <span className="tnum min-w-24 text-center text-[0.9rem] font-semibold">
            KW {woche}
            {vorschau === 0 ? (
              <span className="ml-1 text-muted">·&nbsp;jetzt</span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => setVorschau((v) => v + 1)}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            aria-label="Woche vor"
          >
            <Icon name="back" size={17} className="rotate-180" />
          </button>
        </div>
        <Button variant="ghost" icon="rotate" onClick={() => setVersatz((v) => v + 1)}>
          Weiterdrehen
        </Button>
        <Button variant="ghost" icon="pen" onClick={() => setBearbeiten((b) => !b)}>
          Dienste anpassen
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          Drucken
        </Button>
      </div>

      {bearbeiten ? (
        <Panel className="mb-6 p-5">
          <div className="space-y-2">
            {dienste.map((dienst, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={dienst}
                  onChange={(e) =>
                    setDienste((prev) =>
                      prev.map((d, j) => (j === i ? e.target.value : d)),
                    )
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 outline-none"
                  aria-label={`Dienst ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setDienste((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"
                  aria-label={`${dienst} entfernen`}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button
              variant="soft"
              size="sm"
              icon="plus"
              onClick={() => setDienste((prev) => [...prev, "Neuer Dienst"])}
            >
              Dienst hinzufügen
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="reset"
              onClick={() => setDienste(STANDARD_DIENSTE)}
            >
              Standard
            </Button>
          </div>
        </Panel>
      ) : null}

      {names.length === 0 ? (
        <Panel>
          <EmptyState icon="broom" title="Diese Klasse hat noch keine Namen" />
        </Panel>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {zuteilung.map(({ dienst, personen }) => (
            <article
              key={dienst}
              className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]"
            >
              <h3 className="mb-3 text-[0.8rem] font-bold tracking-wide text-muted uppercase">
                {dienst}
              </h3>
              <ul className="space-y-1">
                {personen.map((person, i) => (
                  <li
                    key={`${person}-${i}`}
                    className="font-display text-2xl leading-tight font-bold"
                    style={{ color: "var(--a-teal)" }}
                  >
                    {person}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      <p className="mt-7 max-w-2xl text-[0.9rem] leading-relaxed text-muted">
        Die Zuteilung hängt allein an der Kalenderwoche — dieselbe Woche zeigt
        auf jedem Gerät dieselben Namen, ganz ohne Speichern. Mit
        „Weiterdrehen“ verschiebst du die Reihenfolge dauerhaft, etwa nach
        Ferien oder wenn jemand die Klasse verlässt.
      </p>
    </ToolShell>
  );
}
