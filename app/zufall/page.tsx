"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Gluecksrad, zielDrehung } from "@/components/Gluecksrad";
import { Button, Kbd, Panel, Segmented, Stepper } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import { shuffle } from "@/lib/classes";
import { playReveal, playTick, unlockAudio } from "@/lib/audio";

type Art = "namen" | "rad";

export default function ZufallPage() {
  const { classes, klasse, names, selectedId, setSelectedId } =
    useRoster("zufall");
  const classKey = klasse?.id ?? "none";

  const [art, setArt] = useStored<Art>("zufall.art", "namen");
  const [count, setCount] = useState(1);
  const [noRepeat, setNoRepeat] = useStored("zufall.ohneWdh", true);
  const [used, setUsed] = useStored<string[]>(`zufall.used.${classKey}`, []);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);

  /* Namensmodus: kurzes Flackern durch die Liste */
  const [flicker, setFlicker] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  /* Radmodus: Drehwinkel und das Ergebnis, das nach dem Auslaufen faellt */
  const [rotation, setRotation] = useState(0);
  const offenesErgebnis = useRef<string[] | null>(null);
  const radErschoepft = useRef(false);

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

  /* Das Rad zieht immer genau einen Namen. */
  const effektiveAnzahl = art === "rad" ? 1 : count;

  /** Wer noch nicht dran war — bei erschöpftem Topf wieder alle. */
  const pool = useMemo(() => {
    if (!noRepeat) return names;
    const rest = names.filter((n) => !used.includes(n));
    return rest.length >= effektiveAnzahl ? rest : names;
  }, [names, used, noRepeat, effektiveAnzahl]);

  /** Gemeinsame Ziehung für beide Darstellungen. */
  const ziehen = useCallback(() => {
    const erschoepft =
      noRepeat &&
      names.filter((n) => !used.includes(n)).length < effektiveAnzahl;
    const quelle = erschoepft ? names : pool;
    const gezogen = shuffle(quelle).slice(
      0,
      Math.min(effektiveAnzahl, quelle.length),
    );
    return { gezogen, erschoepft };
  }, [noRepeat, names, used, effektiveAnzahl, pool]);

  const uebernehmen = useCallback(
    (gezogen: string[], erschoepft: boolean) => {
      setDrawn(gezogen);
      setUsed(erschoepft ? gezogen : [...used, ...gezogen]);
      playReveal();
    },
    [setUsed, used],
  );

  const draw = useCallback(() => {
    if (spinning || names.length === 0) return;
    unlockAudio();
    const { gezogen, erschoepft } = ziehen();
    if (gezogen.length === 0) return;

    setSpinning(true);
    setDrawn([]);

    if (art === "rad") {
      /* Der Gewinner steht vorher fest; das Rad wird so weit gedreht,
         dass genau sein Segment unter dem Zeiger stehen bleibt. */
      const index = names.indexOf(gezogen[0]);
      offenesErgebnis.current = erschoepft ? gezogen : [...gezogen];
      radErschoepft.current = erschoepft;
      setRotation((r) => zielDrehung(r, index, names.length));
      // Das Ergebnis faellt in onSpinEnd, wenn die Drehung ausgelaufen ist.
      return;
    }

    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const schritte = 14;
    for (let i = 0; i < schritte; i++) {
      timers.current.push(
        window.setTimeout(
          () => {
            setFlicker(
              shuffle(names).slice(0, Math.min(effektiveAnzahl, names.length)),
            );
            playTick(false);
          },
          i * (60 + i * 7),
        ),
      );
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setFlicker([]);
          setSpinning(false);
          uebernehmen(gezogen, erschoepft);
        },
        schritte * 60 + schritte * schritte * 3.5,
      ),
    );
  }, [spinning, names, art, ziehen, uebernehmen, effektiveAnzahl]);

  const radFertig = useCallback(() => {
    const ergebnis = offenesErgebnis.current;
    offenesErgebnis.current = null;
    setSpinning(false);
    // Ein zweiter Aufruf findet nichts mehr vor und tut nichts.
    if (ergebnis) uebernehmen(ergebnis, radErschoepft.current);
  }, [uebernehmen]);

  /* Sicherheitsnetz: Verschluckt der Browser das transitionend — etwa
     weil der Tab waehrend der Drehung im Hintergrund lag — bliebe die
     Bedienung sonst dauerhaft gesperrt. */
  useEffect(() => {
    if (!spinning || art !== "rad") return;
    const id = window.setTimeout(() => radFertig(), 5400);
    return () => window.clearTimeout(id);
  }, [spinning, art, radFertig]);

  useHotkeys({ " ": draw, Enter: draw });

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
      {art === "rad" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-4">
          {names.length === 0 ? (
            <p className="font-display text-3xl font-bold text-muted">
              Erst eine Klasse mit Namen wählen
            </p>
          ) : (
            <>
              <Gluecksrad
                names={names}
                rotation={rotation}
                spinning={spinning}
                verbraucht={noRepeat ? used : []}
                onSpinEnd={radFertig}
              />
              <p
                className="min-h-[1.2em] font-display leading-none font-extrabold"
                style={{
                  color: "var(--a-violet)",
                  fontSize: "clamp(1.75rem, 5vw, 3.75rem)",
                  letterSpacing: "-0.03em",
                }}
              >
                {spinning ? "" : (drawn[0] ?? "")}
              </p>
            </>
          )}
        </div>
      ) : (
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
      )}

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
            icon={art === "rad" ? "rotate" : "dice"}
            onClick={draw}
            disabled={spinning || names.length === 0}
            className="min-w-40"
          >
            {art === "rad" ? "Drehen" : "Ziehen"}
          </Button>

          <Segmented<Art>
            value={art}
            onChange={(a) => {
              setArt(a);
              setDrawn([]);
              setFlicker([]);
            }}
            options={[
              { value: "namen", label: "Namen", icon: "dice" },
              { value: "rad", label: "Glücksrad", icon: "rotate" },
            ]}
          />

          {art === "namen" ? (
            <Stepper
              value={count}
              onChange={setCount}
              min={1}
              max={Math.max(1, Math.min(8, names.length))}
              suffix={count === 1 ? "Name" : "Namen"}
            />
          ) : null}

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
      {used.length > 0 && art === "namen" ? (
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
