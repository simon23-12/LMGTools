"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Button, Kbd, Panel, Stepper } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import { shuffle } from "@/lib/classes";
import { playReveal, playTick, unlockAudio } from "@/lib/audio";

export default function ZufallPage() {
  const { classes, klasse, names, selectedId, setSelectedId } =
    useRoster("zufall");
  const classKey = klasse?.id ?? "none";

  const [count, setCount] = useState(1);
  const [noRepeat, setNoRepeat] = useState(true);
  const [used, setUsed] = useStored<string[]>(`zufall.used.${classKey}`, []);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [flicker, setFlicker] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  // Gezogene Namen gehoeren zur vorherigen Klasse.
  const [letzteKlasse, setLetzteKlasse] = useState(classKey);
  if (letzteKlasse !== classKey) {
    setLetzteKlasse(classKey);
    setDrawn([]);
    setFlicker([]);
  }

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  /** Wer noch nicht dran war — bei erschöpftem Topf wieder alle. */
  const pool = useMemo(() => {
    if (!noRepeat) return names;
    const rest = names.filter((n) => !used.includes(n));
    return rest.length >= count ? rest : names;
  }, [names, used, noRepeat, count]);

  const draw = useCallback(() => {
    if (spinning || names.length === 0) return;
    unlockAudio();

    const exhausted = noRepeat && names.filter((n) => !used.includes(n)).length < count;
    const source = exhausted ? names : pool;
    const picked = shuffle(source).slice(0, Math.min(count, source.length));

    setSpinning(true);
    setDrawn([]);

    /* Kurzes Flackern durch die Namen, dann faellt das Ergebnis. */
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setFlicker(shuffle(names).slice(0, Math.min(count, names.length)));
          playTick(false);
        }, i * (60 + i * 7)),
      );
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setFlicker([]);
          setDrawn(picked);
          setSpinning(false);
          setUsed(exhausted ? picked : [...used, ...picked]);
          playReveal();
        },
        steps * 60 + steps * steps * 3.5,
      ),
    );
  }, [spinning, names, noRepeat, used, count, pool, setUsed]);

  useHotkeys({
    " ": draw,
    Enter: draw,
  });

  const shown = flicker.length > 0 ? flicker : drawn;
  const remaining = names.filter((n) => !used.includes(n)).length;

  return (
    <ToolShell
      slug="zufall"
      bleed
      hint={
        <>
          <Kbd>Leer</Kbd> ziehen
        </>
      }
    >
      {/* ---------- Bühne ---------- */}
      <button
        type="button"
        onClick={draw}
        disabled={names.length === 0}
        className="flex flex-1 cursor-pointer flex-col items-center justify-center px-6 py-10 text-center disabled:cursor-default"
      >
        {shown.length === 0 ? (
          <span className="font-display text-3xl font-bold text-muted sm:text-4xl">
            {names.length === 0
              ? "Erst eine Klasse mit Namen wählen"
              : "Tippen oder Leertaste"}
          </span>
        ) : (
          <span
            className={`flex flex-col items-center gap-3 transition ${
              spinning ? "opacity-60" : "opacity-100"
            }`}
          >
            {shown.map((name) => (
              <span
                key={name}
                className="font-display leading-[1.02] font-extrabold"
                style={{
                  color: "var(--a-violet)",
                  fontSize:
                    shown.length > 2
                      ? "clamp(2.5rem, 9vw, 6rem)"
                      : "clamp(3.5rem, 15vw, 13rem)",
                  letterSpacing: "-0.035em",
                }}
              >
                {name}
              </span>
            ))}
          </span>
        )}
      </button>

      {/* ---------- Bedienung ---------- */}
      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <ClassPicker
            classes={classes}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <Button
            variant="primary"
            size="lg"
            icon="dice"
            onClick={draw}
            disabled={spinning || names.length === 0}
            className="min-w-40"
          >
            Ziehen
          </Button>

          <Stepper
            value={count}
            onChange={setCount}
            min={1}
            max={Math.max(1, Math.min(8, names.length))}
            suffix={count === 1 ? "Name" : "Namen"}
          />

          <button
            type="button"
            onClick={() => setNoRepeat((r) => !r)}
            className={`h-11 rounded-xl border px-4 text-[0.9rem] font-medium transition ${
              noRepeat
                ? "border-transparent text-white"
                : "border-line text-muted hover:text-ink"
            }`}
            style={noRepeat ? { background: "var(--a-violet)" } : undefined}
            title="Verhindert, dass dieselbe Person mehrfach hintereinander drankommt"
          >
            Ohne Wiederholung
          </button>

          {noRepeat && names.length > 0 ? (
            <span className="text-sm text-muted">
              noch {remaining} von {names.length}
            </span>
          ) : null}

          {used.length > 0 ? (
            <Button variant="ghost" icon="reset" onClick={() => setUsed([])}>
              Topf füllen
            </Button>
          ) : null}
        </div>
      </div>

      {/* ---------- Bereits gezogen ---------- */}
      {used.length > 0 ? (
        <div className="border-t border-line">
          <div className="mx-auto w-full max-w-[1500px] px-5 py-4">
            <Panel className="border-0 bg-transparent shadow-none">
              <p className="mb-2 text-[0.78rem] font-semibold tracking-wide text-muted uppercase">
                Schon dran gewesen
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {used.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="rounded-lg bg-surface-2 px-2.5 py-1 text-[0.85rem] text-muted"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}
    </ToolShell>
  );
}
