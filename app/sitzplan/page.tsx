"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Button, EmptyState, Panel, Stepper } from "@/components/ui";
import { shuffle, shortName } from "@/lib/classes";
import { useStored } from "@/lib/storage";

type Plan = {
  reihen: number;
  proReihe: number;
  /** Laenge reihen*proReihe; null = freier Platz */
  plaetze: (string | null)[];
};

const LEER: Plan = { reihen: 4, proReihe: 6, plaetze: Array(24).fill(null) };

export default function SitzplanPage() {
  const { classes, hydrated, klasse, names, selectedId, setSelectedId } =
    useRoster("sitzplan");
  const classKey = klasse?.id ?? "none";

  const [plan, setPlan] = useStored<Plan>(`sitzplan.${classKey}`, LEER);
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);

  // Beim Klassenwechsel darf keine Auswahl aus der alten Liste stehen bleiben.
  const [letzteKlasse, setLetzteKlasse] = useState(classKey);
  if (letzteKlasse !== classKey) {
    setLetzteKlasse(classKey);
    setAusgewaehlt(null);
  }

  /* Namen, die nicht mehr in der Klassenliste stehen, fallen raus. */
  const plaetze = useMemo(() => {
    const gesamt = plan.reihen * plan.proReihe;
    const basis = Array.from({ length: gesamt }, (_, i) => plan.plaetze[i] ?? null);
    return basis.map((n) => (n && names.includes(n) ? n : null));
  }, [plan, names]);

  const sitzend = plaetze.filter(Boolean) as string[];
  const uebrig = names.filter((n) => !sitzend.includes(n));

  function setzePlaetze(next: (string | null)[]) {
    setPlan({ ...plan, plaetze: next });
  }

  function aufPlatzKlicken(index: number) {
    const belegt = plaetze[index];

    if (ausgewaehlt) {
      const next = [...plaetze];
      // Steht der Gewählte schon irgendwo, wird der alte Platz frei
      // bzw. die beiden tauschen.
      const alterIndex = next.indexOf(ausgewaehlt);
      next[index] = ausgewaehlt;
      if (alterIndex >= 0 && alterIndex !== index) {
        next[alterIndex] = belegt ?? null;
      }
      setzePlaetze(next);
      setAusgewaehlt(null);
      return;
    }

    if (belegt) setAusgewaehlt(belegt);
  }

  function platzLeeren(index: number) {
    const next = [...plaetze];
    next[index] = null;
    setzePlaetze(next);
  }

  function zufaellig() {
    const gesamt = plan.reihen * plan.proReihe;
    const gemischt = shuffle(names).slice(0, gesamt);
    const next: (string | null)[] = Array(gesamt).fill(null);
    gemischt.forEach((name, i) => (next[i] = name));
    setzePlaetze(next);
    setAusgewaehlt(null);
  }

  function raumAendern(patch: Partial<Pick<Plan, "reihen" | "proReihe">>) {
    const reihen = patch.reihen ?? plan.reihen;
    const proReihe = patch.proReihe ?? plan.proReihe;
    const gesamt = reihen * proReihe;
    const next = Array.from({ length: gesamt }, (_, i) => plaetze[i] ?? null);
    setPlan({ reihen, proReihe, plaetze: next });
  }

  if (hydrated && classes.length === 0) {
    return (
      <ToolShell slug="sitzplan">
        <Panel className="mx-auto max-w-xl">
          <EmptyState icon="seats" title="Dafür braucht es eine Klassenliste">
            Unter <strong className="text-ink">Klassen</strong> eine Liste
            anlegen, dann lässt sich hier setzen.
          </EmptyState>
        </Panel>
      </ToolShell>
    );
  }

  return (
    <ToolShell slug="sitzplan">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ClassPicker
          classes={classes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <Stepper
          value={plan.reihen}
          onChange={(v) => raumAendern({ reihen: v })}
          min={1}
          max={10}
          suffix="Reihen"
        />
        <Stepper
          value={plan.proReihe}
          onChange={(v) => raumAendern({ proReihe: v })}
          min={1}
          max={12}
          suffix="pro Reihe"
        />
        <Button variant="primary" icon="shuffle" onClick={zufaellig}>
          Zufällig setzen
        </Button>
        <Button
          variant="outline"
          icon="reset"
          onClick={() => setzePlaetze(Array(plaetze.length).fill(null))}
        >
          Plan leeren
        </Button>
        <Button variant="ghost" onClick={() => window.print()}>
          Drucken
        </Button>
      </div>

      {/* ---------- Raum ---------- */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-8">
        <div className="mb-7 flex items-center gap-4">
          <div className="h-2 flex-1 rounded-full bg-surface-2" />
          <span className="text-[0.8rem] font-bold tracking-[0.16em] text-muted uppercase">
            Tafel
          </span>
          <div className="h-2 flex-1 rounded-full bg-surface-2" />
        </div>

        <div className="space-y-3 overflow-x-auto">
          {Array.from({ length: plan.reihen }).map((_, r) => (
            <div
              key={r}
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${plan.proReihe}, minmax(5.5rem, 1fr))`,
              }}
            >
              {Array.from({ length: plan.proReihe }).map((_, c) => {
                const index = r * plan.proReihe + c;
                const name = plaetze[index];
                const istAusgewaehlt = Boolean(name) && name === ausgewaehlt;
                return (
                  <div key={c} className="group relative">
                    <button
                      type="button"
                      onClick={() => aufPlatzKlicken(index)}
                      className={`flex h-[4.5rem] w-full items-center justify-center rounded-xl border-2 px-1.5 text-center transition ${
                        name
                          ? "border-transparent"
                          : ausgewaehlt
                            ? "border-dashed border-[var(--a-teal)] bg-surface-2"
                            : "border-dashed border-line bg-surface-2"
                      } ${istAusgewaehlt ? "ring-2 ring-[var(--a-teal)] ring-offset-2 ring-offset-[var(--surface)]" : ""}`}
                      style={
                        name
                          ? {
                              background:
                                "color-mix(in srgb, var(--a-teal) 14%, transparent)",
                              color: "var(--a-teal)",
                            }
                          : undefined
                      }
                      title={name ?? "Freier Platz"}
                    >
                      <span className="font-display text-[0.95rem] leading-tight font-bold break-words">
                        {name ?? ""}
                      </span>
                    </button>
                    {name ? (
                      <button
                        type="button"
                        onClick={() => platzLeeren(index)}
                        className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full border border-line bg-surface text-muted opacity-0 shadow-[var(--shadow-sm)] transition group-hover:opacity-100 hover:text-ink"
                        aria-label={`${name} vom Platz nehmen`}
                        title="Platz freimachen"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Noch zu setzen ---------- */}
      <div className="mt-6">
        <p className="mb-2.5 text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
          {ausgewaehlt
            ? `„${ausgewaehlt}“ ausgewählt — jetzt einen Platz antippen`
            : uebrig.length > 0
              ? `Noch ohne Platz (${uebrig.length})`
              : "Alle sitzen"}
        </p>
        <div className="flex flex-wrap gap-2">
          {uebrig.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                setAusgewaehlt((a) => (a === name ? null : name))
              }
              className={`h-10 rounded-xl border px-3.5 text-[0.95rem] font-semibold transition ${
                ausgewaehlt === name
                  ? "border-transparent text-white"
                  : "border-line text-ink hover:bg-surface-2"
              }`}
              style={
                ausgewaehlt === name
                  ? { background: "var(--a-teal)" }
                  : undefined
              }
            >
              {shortName(name, 16)}
            </button>
          ))}
          {ausgewaehlt && !uebrig.includes(ausgewaehlt) ? (
            <button
              type="button"
              onClick={() => setAusgewaehlt(null)}
              className="h-10 rounded-xl border border-line px-3.5 text-[0.95rem] font-medium text-muted"
            >
              Auswahl aufheben
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-[0.9rem] leading-relaxed text-muted">
        Namen antippen und dann auf einen Platz — belegte Plätze tauschen
        untereinander. Der Plan bleibt pro Klasse gespeichert.
      </p>
    </ToolShell>
  );
}
