"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Anwesenheit } from "@/components/Anwesenheit";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Button, EmptyState, Kbd, Panel, Segmented, Stepper } from "@/components/ui";
import {
  buildGroups,
  recordHistory,
  type PairCounts,
} from "@/lib/grouping";
import { formatClock, useElementSize, useHotkeys, useNow, useWakeLock } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import { playGong, playTick, unlockAudio } from "@/lib/audio";

type Groesse = 2 | 3 | 4;

/* Gruppenfarben — jede „Insel“ auf der Bühne bekommt eine eigene. */
const FARBEN = [
  "var(--a-blue)",
  "var(--a-orange)",
  "var(--a-teal)",
  "var(--a-violet)",
  "var(--a-green)",
  "var(--a-pink)",
  "var(--a-slate)",
  "var(--a-red)",
];

export default function MinglePage() {
  const { classes, hydrated, klasse, names, selectedId, setSelectedId } =
    useRoster("mingle");
  const classKey = klasse?.id ?? "none";

  const [groesse, setGroesse] = useStored<Groesse>("mingle.groesse", 2);
  const [sekunden, setSekunden] = useStored("mingle.sekunden", 60);
  const [absent, setAbsent] = useState<string[]>([]);
  const [zeigeListe, setZeigeListe] = useState(false);

  const [gruppen, setGruppen] = useState<string[][]>([]);
  const [runde, setRunde] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [rest, setRest] = useState(sekunden * 1000);
  const [historie, setHistorie] = useState<PairCounts>({});

  const [buehneRef, buehne] = useElementSize<HTMLDivElement>();

  // Klassenwechsel raeumt die Bühne.
  const [letzteKlasse, setLetzteKlasse] = useState(classKey);
  if (letzteKlasse !== classKey) {
    setLetzteKlasse(classKey);
    setAbsent([]);
    setGruppen([]);
    setRunde(0);
    setDeadline(null);
    setHistorie({});
  }

  const laeuft = deadline !== null;
  const now = useNow(laeuft ? 200 : 1000);
  useWakeLock(laeuft);

  const restMs = laeuft && now > 0 ? Math.max(0, deadline - now) : rest;
  const dauerMs = sekunden * 1000;

  const anwesend = useMemo(
    () => names.filter((n) => !absent.includes(n)),
    [names, absent],
  );

  /** Neu mischen und die Uhr für die nächste Runde stellen. */
  const naechsteRunde = useCallback(
    (mitGong: boolean) => {
      if (anwesend.length < 2) return;
      /* Ueber die Gruppenzahl statt die Gruppengroesse einteilen:
         so wandert ein Rest in eine bestehende Gruppe, statt jemanden
         allein sitzen zu lassen. Aus 23 mal „zu zweit" werden 11
         Gruppen — zehn Paare und ein Trio. */
      const ergebnis = buildGroups({
        names: anwesend,
        groupCount: Math.max(1, Math.floor(anwesend.length / groesse)),
        history: historie,
      });
      setGruppen(ergebnis.groups);
      setHistorie(recordHistory(ergebnis.groups, historie));
      setRunde((r) => r + 1);
      setRest(dauerMs);
      setDeadline(Date.now() + dauerMs);
      if (mitGong) playGong();
    },
    [anwesend, groesse, historie, dauerMs],
  );

  /* Rundenwechsel terminieren, nicht aus der Anzeige ableiten. */
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setTimeout(
      () => naechsteRunde(true),
      Math.max(0, deadline - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [deadline, naechsteRunde]);

  /* Letzte Sekunden hörbar machen */
  const letzteSekunde = useRef(-1);
  useEffect(() => {
    if (!laeuft) return;
    const sek = Math.ceil(restMs / 1000);
    if (sek === letzteSekunde.current) return;
    letzteSekunde.current = sek;
    if (sek <= 3 && sek > 0) playTick(sek === 1);
  }, [restMs, laeuft]);

  const starten = useCallback(() => {
    unlockAudio();
    if (gruppen.length === 0) {
      naechsteRunde(false);
      return;
    }
    setDeadline(Date.now() + rest);
  }, [gruppen.length, naechsteRunde, rest]);

  const pausieren = useCallback(() => {
    if (deadline === null) return;
    setRest(Math.max(0, deadline - Date.now()));
    setDeadline(null);
  }, [deadline]);

  const beenden = useCallback(() => {
    setDeadline(null);
    setGruppen([]);
    setRunde(0);
    setRest(dauerMs);
    setHistorie({});
    letzteSekunde.current = -1;
  }, [dauerMs]);

  useHotkeys({
    " ": () => (laeuft ? pausieren() : starten()),
    ArrowRight: () => naechsteRunde(false),
    r: beenden,
  });

  /* ---- Zielpunkte der Namensschilder ----
     Die Schriftgroesse folgt dem verfuegbaren Platz und dem laengsten
     Namen, nicht der Anzahl der Leute. Innerhalb einer Insel stehen die
     Namen untereinander — nebeneinander kollidieren lange Namen sonst
     unweigerlich, sobald die Zellen schmal werden. */
  const { plaetze, inseln, schriftPx, chipMax } = useMemo(() => {
    const plaetze = new Map<string, { x: number; y: number; farbe: string }>();
    const inseln: {
      x: number;
      y: number;
      breite: number;
      hoehe: number;
      farbe: string;
    }[] = [];

    if (!buehne.width || !buehne.height || gruppen.length === 0) {
      return { plaetze, inseln, schriftPx: 16, chipMax: 160 };
    }

    // Raster, das dem Seitenverhältnis der Bühne folgt
    const spalten = Math.max(
      1,
      Math.min(
        gruppen.length,
        Math.round(Math.sqrt(gruppen.length * (buehne.width / buehne.height))),
      ),
    );
    const zeilen = Math.ceil(gruppen.length / spalten);
    const zellB = buehne.width / spalten;
    const zellH = buehne.height / zeilen;

    const laengster = Math.max(4, ...gruppen.flat().map((n) => n.length));
    const groesste = Math.max(...gruppen.map((g) => g.length));

    /* 0.56 em ist die mittlere Zeichenbreite der fetten Hausschrift,
       dazu der Innenabstand des Schildchens. */
    const maxInselB = zellB * 0.9;
    const nachBreite = (maxInselB - 8) / (laengster * 0.56 + 1.8);
    const nachHoehe = (zellH * 0.88) / (groesste * 2.05 + 1.1);
    const schriftPx = Math.max(10, Math.min(26, nachBreite, nachHoehe));
    const zeilenH = schriftPx * 2.05;

    gruppen.forEach((gruppe, gi) => {
      const spalte = gi % spalten;
      const zeile = Math.floor(gi / spalten);
      const mx = (spalte + 0.5) * zellB;
      const my = (zeile + 0.5) * zellH;

      // Insel umschliesst ihren eigenen Inhalt, statt starr gleich gross zu sein
      const laengsterHier = Math.max(4, ...gruppe.map((n) => n.length));
      const breite = Math.min(
        maxInselB,
        laengsterHier * 0.56 * schriftPx + schriftPx * 2.8,
      );
      const hoehe = gruppe.length * zeilenH + schriftPx * 1.1;
      const farbe = FARBEN[gi % FARBEN.length];

      inseln.push({ x: mx, y: my, breite, hoehe, farbe });

      gruppe.forEach((name, i) => {
        plaetze.set(name, {
          x: mx,
          y: my - hoehe / 2 + schriftPx * 0.55 + (i + 0.5) * zeilenH,
          farbe,
        });
      });
    });

    return { plaetze, inseln, schriftPx, chipMax: maxInselB - 10 };
  }, [gruppen, buehne]);

  const fortschritt = dauerMs > 0 ? 1 - restMs / dauerMs : 0;
  const knapp = laeuft && restMs <= 5000;

  if (hydrated && classes.length === 0) {
    return (
      <ToolShell slug="mingle">
        <Panel className="mx-auto max-w-xl">
          <EmptyState icon="mingle" title="Dafür braucht es eine Klassenliste">
            Lege unter <strong className="text-ink">Klassen</strong> eine Liste
            mit Vornamen an — danach mischt Mingle sie im Minutentakt neu.
          </EmptyState>
        </Panel>
      </ToolShell>
    );
  }

  return (
    <ToolShell
      slug="mingle"
      bleed
      hint={
        <>
          <Kbd>Leer</Kbd> Start <Kbd>→</Kbd> neu mischen
        </>
      }
    >
      {/* ---------- Kopfzeile mit Uhr ---------- */}
      <div className="flex shrink-0 items-baseline justify-center gap-5 px-5 pt-3">
        {runde > 0 ? (
          <span className="text-[0.95rem] font-semibold tracking-wide text-muted uppercase">
            Runde {runde}
          </span>
        ) : null}
        <span
          className="tnum font-display leading-none font-extrabold transition-colors"
          style={{
            fontSize: "clamp(2rem, 6vw, 4rem)",
            letterSpacing: "-0.04em",
            color: knapp ? "var(--lmg-orange)" : "var(--a-pink)",
          }}
        >
          {formatClock(restMs / 1000)}
        </span>
      </div>

      <div className="mx-5 mt-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-linear"
          style={{
            width: `${Math.min(100, Math.max(0, fortschritt * 100))}%`,
            background: knapp ? "var(--lmg-orange)" : "var(--a-pink)",
          }}
        />
      </div>

      {/* ---------- Bühne ---------- */}
      <div ref={buehneRef} className="relative min-h-0 flex-1 overflow-hidden">
        {gruppen.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">
              Immer neue Gesprächspartner
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              Mingle verteilt{" "}
              {anwesend.length > 0
                ? `die ${anwesend.length} Anwesenden`
                : "die Klasse"}{" "}
              auf Gruppen zu {groesse}. Nach {sekunden} Sekunden ertönt der
              Gong und alle gleiten in eine neue Zusammenstellung — wer schon
              miteinander gesprochen hat, wird dabei gemieden. Geht die Zahl
              nicht auf, entsteht eine Gruppe mehr statt einer einzelnen
              Person.
            </p>
          </div>
        ) : (
          <>
            {/* Inseln bleiben liegen, die Namen wandern dazwischen */}
            {inseln.map((insel, i) => (
              <span
                key={i}
                className="pointer-events-none absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: insel.breite,
                  height: insel.hoehe,
                  borderRadius: Math.min(insel.breite, insel.hoehe) * 0.34,
                  transform: `translate(${insel.x}px, ${insel.y}px) translate(-50%, -50%)`,
                  background: `color-mix(in srgb, ${insel.farbe} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${insel.farbe} 22%, transparent)`,
                  transition: "width 1.15s, height 1.15s, border-radius 1.15s",
                }}
              />
            ))}

            {anwesend.map((name) => {
              const platz = plaetze.get(name);
              if (!platz) return null;
              return (
                <span
                  key={name}
                  className="absolute top-0 left-0 overflow-hidden font-display font-bold text-ellipsis whitespace-nowrap shadow-[var(--shadow-sm)]"
                  style={{
                    transform: `translate(${platz.x}px, ${platz.y}px) translate(-50%, -50%)`,
                    transition:
                      "transform 1.15s cubic-bezier(0.34, 0.8, 0.28, 1), background-color 1.15s, color 1.15s",
                    background: `color-mix(in srgb, ${platz.farbe} 17%, var(--surface))`,
                    color: platz.farbe,
                    fontSize: schriftPx,
                    lineHeight: 1.25,
                    padding: `${schriftPx * 0.2}px ${schriftPx * 0.55}px`,
                    borderRadius: schriftPx * 0.5,
                    maxWidth: chipMax,
                  }}
                >
                  {name}
                </span>
              );
            })}
          </>
        )}
      </div>

      {/* ---------- Bedienung ---------- */}
      <div className="shrink-0 border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <ClassPicker
            classes={classes}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <Button
            variant="primary"
            size="lg"
            icon={laeuft ? "pause" : "play"}
            onClick={laeuft ? pausieren : starten}
            disabled={anwesend.length < 2}
            className="min-w-36"
          >
            {laeuft ? "Pause" : runde > 0 ? "Weiter" : "Start"}
          </Button>

          <Button
            variant="soft"
            size="lg"
            icon="shuffle"
            onClick={() => naechsteRunde(false)}
            disabled={anwesend.length < 2}
          >
            Neu mischen
          </Button>

          <Segmented<Groesse>
            value={groesse}
            onChange={(g) => {
              setGroesse(g);
              if (gruppen.length > 0) beenden();
            }}
            options={[
              { value: 2, label: "Zu zweit" },
              { value: 3, label: "Zu dritt" },
              { value: 4, label: "Zu viert" },
            ]}
          />

          <Stepper
            value={sekunden}
            onChange={(v) => {
              setSekunden(v);
              if (!laeuft) setRest(v * 1000);
            }}
            min={15}
            max={600}
            step={15}
            suffix="Sek"
          />

          <Button
            variant={absent.length > 0 ? "soft" : "ghost"}
            icon="people"
            onClick={() => setZeigeListe((z) => !z)}
            title="Wer heute fehlt, wird nicht eingeteilt"
          >
            Abwesend
            <span className="opacity-70">
              {absent.length > 0 ? `(${absent.length})` : `· ${names.length} da`}
            </span>
          </Button>

          {runde > 0 ? (
            <Button variant="ghost" icon="reset" onClick={beenden}>
              Beenden
            </Button>
          ) : null}
        </div>

        {zeigeListe ? (
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-5">
            <Anwesenheit
              names={names}
              absent={absent}
              onToggle={(name) =>
                setAbsent((prev) =>
                  prev.includes(name)
                    ? prev.filter((n) => n !== name)
                    : [...prev, name],
                )
              }
              onReset={() => setAbsent([])}
            />
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
