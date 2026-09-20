"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import {
  Button,
  Field,
  Kbd,
  Panel,
  Segmented,
  Stepper,
  TextInput,
} from "@/components/ui";
import { Icon } from "@/components/Icons";
import { useHotkeys, useNow, useWakeLock } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import { playGong, playReveal, playTick, unlockAudio } from "@/lib/audio";

/* ---------------------------------------------------------------
   Vocab Battle
   Zwei Partner sitzen nebeneinander vor dem Beamer und bekommen
   gleichzeitig verschiedene Vokabeln. Geschrieben wird auf Papier —
   das Tool gibt nur Takt und am Ende die Loesungen vor, damit die
   beiden sich gegenseitig korrigieren koennen.
----------------------------------------------------------------- */

type Phase = "setup" | "intro" | "run" | "result";
type Paar = { de: string; en: string };
type Seite = "a" | "b";

const FARBE_A = "var(--a-blue)";
const FARBE_B = "var(--a-orange)";

const BEISPIEL_DE =
  "das Haus, der Baum, die Straße, die Freundschaft, laufen, verkaufen, die Antwort, gefährlich, der Schlüssel, entscheiden, das Wetter, ruhig, die Erfahrung, versprechen, die Umwelt, der Nachbar, verbessern, die Meinung, wachsen, die Rechnung";
const BEISPIEL_EN =
  "house, tree, street, friendship, to run, to sell, answer, dangerous, key, to decide, weather, quiet, experience, to promise, environment, neighbour, to improve, opinion, to grow, bill";

/** Komma, Semikolon, Tabulator und Zeilenumbruch trennen gleichwertig. */
function parseListe(text: string): string[] {
  return text
    .split(/[,;\n\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function mischeKopie<T>(items: T[]): T[] {
  const kopie = [...items];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

export default function VocabBattlePage() {
  const [woerterRoh, setWoerterRoh] = useStored("battle.woerter", BEISPIEL_DE);
  const [loesungenRoh, setLoesungenRoh] = useStored(
    "battle.loesungen",
    BEISPIEL_EN,
  );
  const [anzahl, setAnzahl] = useStored("battle.anzahl", 10);
  const [sekunden, setSekunden] = useStored("battle.sekunden", 10);
  const [nameA, setNameA] = useStored("battle.nameA", "Partner A");
  const [nameB, setNameB] = useStored("battle.nameB", "Partner B");
  const [verteilung, setVerteilung] = useStored<"reihe" | "zufall">(
    "battle.verteilung",
    "reihe",
  );

  const [phase, setPhase] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [listeA, setListeA] = useState<Paar[]>([]);
  const [listeB, setListeB] = useState<Paar[]>([]);
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [rest, setRest] = useState(sekunden * 1000);
  const [fehler, setFehler] = useState<{ a: number[]; b: number[] }>({
    a: [],
    b: [],
  });

  const paare = useMemo<Paar[]>(() => {
    const de = parseListe(woerterRoh);
    const en = parseListe(loesungenRoh);
    const n = Math.min(de.length, en.length);
    return Array.from({ length: n }, (_, i) => ({ de: de[i], en: en[i] }));
  }, [woerterRoh, loesungenRoh]);

  const deAnzahl = useMemo(() => parseListe(woerterRoh).length, [woerterRoh]);
  const enAnzahl = useMemo(
    () => parseListe(loesungenRoh).length,
    [loesungenRoh],
  );

  /* Jeder braucht eigene Woerter — darum halbieren, nicht teilen. */
  const maxProPartner = Math.floor(paare.length / 2);
  const proPartner = Math.min(anzahl, maxProPartner);

  const laeuft = phase === "run" && deadline !== null;
  const now = useNow(phase === "setup" ? 1000 : 100);
  useWakeLock(phase !== "setup");

  const dauerMs = sekunden * 1000;
  const restMs = laeuft && now > 0 ? Math.max(0, deadline - now) : rest;

  /* ---------- Ablauf ---------- */

  const abbrechen = useCallback(() => {
    setPhase("setup");
    setDeadline(null);
    setCountdown(null);
    setIndex(0);
    setRest(dauerMs);
  }, [dauerMs]);

  const starten = useCallback(() => {
    if (maxProPartner < 1) return;
    unlockAudio();
    const n = Math.min(anzahl, maxProPartner);
    const quelle = verteilung === "zufall" ? mischeKopie(paare) : paare;
    setListeA(quelle.slice(0, n));
    setListeB(quelle.slice(n, n * 2));
    setFehler({ a: [], b: [] });
    setIndex(0);
    setRest(dauerMs);
    setDeadline(null);
    setCountdown(null);
    setPhase("intro");
  }, [anzahl, dauerMs, maxProPartner, paare, verteilung]);

  /* Titel, dann Countdown von 5 — danach faellt der Startschuss. */
  useEffect(() => {
    if (phase !== "intro") return;
    const timer: number[] = [];
    for (let i = 0; i < 5; i++) {
      timer.push(
        window.setTimeout(() => {
          setCountdown(5 - i);
          playTick(i === 4);
        }, 1500 + i * 1000),
      );
    }
    timer.push(
      window.setTimeout(() => {
        setCountdown(null);
        setPhase("run");
        setDeadline(Date.now() + dauerMs);
        playReveal();
      }, 6500),
    );
    return () => timer.forEach((id) => window.clearTimeout(id));
  }, [phase, dauerMs]);

  /* Keine Seiteneffekte im State-Updater: im Entwicklungsmodus ruft
     React ihn doppelt auf — der Gong erklaenge sonst zweimal. */
  const weiter = useCallback(() => {
    if (index + 1 >= listeA.length) {
      setPhase("result");
      setDeadline(null);
      playGong();
      return;
    }
    setIndex(index + 1);
    setRest(dauerMs);
    setDeadline(Date.now() + dauerMs);
    playReveal();
  }, [dauerMs, index, listeA.length]);

  /* Der Wortwechsel wird terminiert, nicht aus der Anzeige abgeleitet. */
  useEffect(() => {
    if (phase !== "run" || deadline === null) return;
    const id = window.setTimeout(weiter, Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(id);
  }, [phase, deadline, weiter]);

  /* Die letzten Sekunden hoerbar machen */
  const letzteSekunde = useRef(-1);
  useEffect(() => {
    if (!laeuft) return;
    const sek = Math.ceil(restMs / 1000);
    if (sek === letzteSekunde.current) return;
    letzteSekunde.current = sek;
    if (sek <= 3 && sek > 0) playTick(sek === 1);
  }, [restMs, laeuft]);

  const pausieren = useCallback(() => {
    if (deadline === null) return;
    setRest(Math.max(0, deadline - Date.now()));
    setDeadline(null);
  }, [deadline]);

  const fortsetzen = useCallback(() => {
    setDeadline(Date.now() + rest);
  }, [rest]);

  useHotkeys({
    " ": () => {
      if (phase === "setup") starten();
      else if (phase === "run") (laeuft ? pausieren : fortsetzen)();
    },
    ArrowRight: () => {
      if (phase === "run") weiter();
    },
    Escape: abbrechen,
    r: abbrechen,
  });

  function toggleFehler(seite: Seite, i: number) {
    setFehler((prev) => {
      const liste = prev[seite];
      return {
        ...prev,
        [seite]: liste.includes(i)
          ? liste.filter((x) => x !== i)
          : [...liste, i],
      };
    });
  }

  const fortschritt = dauerMs > 0 ? 1 - restMs / dauerMs : 0;
  const knapp = laeuft && restMs <= 3000;

  /* ---------------- Einrichtung ---------------- */

  if (phase === "setup") {
    return (
      <ToolShell
        slug="vocab-battle"
        hint={
          <>
            <Kbd>Leer</Kbd> Start
          </>
        }
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-7">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Zwei Hefte, zwei Wortlisten, eine Uhr.
            </h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted">
              Beide Partner sehen gleichzeitig ein eigenes deutsches Wort und
              schreiben die englische Lösung auf. Nach {sekunden} Sekunden
              wechselt es. Am Ende erscheinen alle Lösungen — jeder korrigiert
              das Blatt des anderen, wer weniger Fehler hat, gewinnt.
            </p>
          </div>

          <Panel title="Vokabeln" className="mb-5">
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <Field
                label="Deutsch"
                hint="Getrennt durch Komma oder Zeilenumbruch."
              >
                <textarea
                  value={woerterRoh}
                  onChange={(e) => setWoerterRoh(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-[0.9rem] leading-relaxed outline-none"
                  placeholder="das Haus, der Baum, laufen"
                />
              </Field>
              <Field
                label="Englisch"
                hint="Gleiche Reihenfolge wie oben — Wort 1 gehört zu Lösung 1."
              >
                <textarea
                  value={loesungenRoh}
                  onChange={(e) => setLoesungenRoh(e.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-[0.9rem] leading-relaxed outline-none"
                  placeholder="house, tree, to run"
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3.5 text-sm">
              {deAnzahl === enAnzahl ? (
                <span className="text-muted">
                  <strong className="font-semibold text-ink">
                    {paare.length} Paare
                  </strong>{" "}
                  erkannt — das reicht für {maxProPartner} Wörter pro Partner.
                </span>
              ) : (
                <span style={{ color: "var(--alert)" }}>
                  {deAnzahl} deutsche Wörter, aber {enAnzahl} Lösungen. Es
                  zählen die ersten {paare.length} Paare.
                </span>
              )}
            </div>
          </Panel>

          <Panel title="Ablauf" className="mb-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-5 p-5">
              <Field label="Wörter pro Partner">
                <Stepper
                  value={anzahl}
                  onChange={setAnzahl}
                  min={1}
                  max={50}
                  suffix="Wörter"
                />
              </Field>
              <Field label="Zeit pro Wort">
                <Stepper
                  value={sekunden}
                  onChange={(v) => {
                    setSekunden(v);
                    setRest(v * 1000);
                  }}
                  min={3}
                  max={120}
                  suffix="Sek"
                />
              </Field>
              <Field label="Verteilung">
                <Segmented<"reihe" | "zufall">
                  value={verteilung}
                  onChange={setVerteilung}
                  options={[
                    { value: "reihe", label: "Der Reihe nach" },
                    { value: "zufall", label: "Zufällig" },
                  ]}
                />
              </Field>
            </div>
            <div className="grid gap-5 border-t border-line p-5 sm:grid-cols-2">
              <Field label="Name links">
                <TextInput
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  placeholder="Partner A"
                />
              </Field>
              <Field label="Name rechts">
                <TextInput
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  placeholder="Partner B"
                />
              </Field>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-4 pb-6">
            <Button
              variant="primary"
              size="lg"
              icon="play"
              onClick={starten}
              disabled={maxProPartner < 1}
            >
              Battle starten
            </Button>
            {maxProPartner < 1 ? (
              <span className="text-sm text-muted">
                Für ein Duell braucht es mindestens zwei Paare.
              </span>
            ) : (
              <span className="text-sm text-muted">
                {proPartner} Wörter pro Partner, je {sekunden} Sekunden —
                zusammen{" "}
                {Math.round((proPartner * sekunden) / 6) / 10} Minuten.
              </span>
            )}
          </div>
        </div>
      </ToolShell>
    );
  }

  /* ---------------- Vorspann ---------------- */

  if (phase === "intro") {
    return (
      <ToolShell slug="vocab-battle" bleed>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
          <h2
            className="battle-title font-display leading-none font-extrabold"
            style={{ fontSize: "clamp(2.2rem, 9vw, 6rem)" }}
          >
            <span style={{ color: "var(--lmg-blue)" }}>LMG</span>{" "}
            <span style={{ color: "var(--a-red)" }}>Vocab Battle</span>
          </h2>
          <div className="grid h-[9rem] place-items-center sm:h-[12rem]">
            {countdown === null ? (
              <p className="text-xl text-muted">
                {nameA} gegen {nameB}
              </p>
            ) : (
              <span
                key={countdown}
                className="battle-count tnum font-display leading-none font-extrabold"
                style={{
                  fontSize: "clamp(6rem, 22vw, 14rem)",
                  color: countdown <= 2 ? "var(--lmg-orange)" : "var(--a-red)",
                }}
              >
                {countdown}
              </span>
            )}
          </div>
          <Button variant="ghost" icon="x" onClick={abbrechen}>
            Abbrechen
          </Button>
        </div>
      </ToolShell>
    );
  }

  /* ---------------- Das Duell ---------------- */

  if (phase === "run") {
    return (
      <ToolShell
        slug="vocab-battle"
        bleed
        hint={
          <>
            <Kbd>Leer</Kbd> Pause <Kbd>→</Kbd> nächstes Wort
          </>
        }
      >
        <div className="flex shrink-0 flex-col items-center gap-2 px-5 pt-3">
          <span className="text-[0.95rem] font-semibold tracking-wide text-muted uppercase">
            Wort {index + 1} von {listeA.length}
          </span>
          <span
            className="tnum font-display leading-none font-extrabold transition-colors"
            style={{
              fontSize: "clamp(2rem, 6vw, 4rem)",
              letterSpacing: "-0.04em",
              color: knapp ? "var(--lmg-orange)" : "var(--a-red)",
            }}
          >
            {Math.ceil(restMs / 1000)}
          </span>
        </div>

        <div className="mx-5 mt-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{
              width: `${Math.min(100, Math.max(0, fortschritt * 100))}%`,
              background: knapp ? "var(--lmg-orange)" : "var(--a-red)",
            }}
          />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line">
          <WortSpalte
            name={nameA}
            farbe={FARBE_A}
            wort={listeA[index]?.de ?? ""}
            index={index}
          />
          <WortSpalte
            name={nameB}
            farbe={FARBE_B}
            wort={listeB[index]?.de ?? ""}
            index={index}
          />
        </div>

        <div className="shrink-0 border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
            <Button
              variant="primary"
              size="lg"
              icon={laeuft ? "pause" : "play"}
              onClick={laeuft ? pausieren : fortsetzen}
              className="min-w-36"
            >
              {laeuft ? "Pause" : "Weiter"}
            </Button>
            <Button variant="soft" size="lg" icon="rotate" onClick={weiter}>
              Nächstes Wort
            </Button>
            <Button
              variant="ghost"
              icon="check"
              onClick={() => {
                setPhase("result");
                setDeadline(null);
                playGong();
              }}
            >
              Zur Auflösung
            </Button>
            <Button variant="ghost" icon="reset" onClick={abbrechen}>
              Abbrechen
            </Button>
          </div>
        </div>
      </ToolShell>
    );
  }

  /* ---------------- Auflösung ---------------- */

  const fehlerA = fehler.a.length;
  const fehlerB = fehler.b.length;
  const ergebnis =
    fehlerA === fehlerB
      ? "Unentschieden"
      : `${fehlerA < fehlerB ? nameA : nameB} gewinnt`;

  return (
    <ToolShell slug="vocab-battle">
      <div className="mx-auto max-w-5xl pb-6">
        <div className="mb-6 text-center">
          <p className="text-[0.8rem] font-bold tracking-[0.14em] text-muted uppercase">
            Tauscht die Blätter und hakt jeden Fehler an
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            {ergebnis}
          </h2>
          <p className="mt-2 text-muted">
            {fehlerA} zu {fehlerB} Fehlern
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <LoesungsSpalte
            name={nameA}
            farbe={FARBE_A}
            paare={listeA}
            fehler={fehler.a}
            onToggle={(i) => toggleFehler("a", i)}
          />
          <LoesungsSpalte
            name={nameB}
            farbe={FARBE_B}
            paare={listeB}
            fehler={fehler.b}
            onToggle={(i) => toggleFehler("b", i)}
          />
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" icon="play" onClick={starten}>
            Noch eine Runde
          </Button>
          <Button variant="soft" size="lg" icon="pen" onClick={abbrechen}>
            Vokabeln ändern
          </Button>
        </div>
      </div>
    </ToolShell>
  );
}

/* ---------------------------------------------------------------
   Bausteine
----------------------------------------------------------------- */

function WortSpalte({
  name,
  farbe,
  wort,
  index,
}: {
  name: string;
  farbe: string;
  wort: string;
  index: number;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-6 px-4 py-6 text-center">
      <span
        className="rounded-full px-4 py-1.5 font-display text-[0.95rem] font-bold tracking-wide uppercase"
        style={{
          background: `color-mix(in srgb, ${farbe} 14%, transparent)`,
          color: farbe,
        }}
      >
        {name}
      </span>
      <span
        key={index}
        className="battle-in font-display leading-[1.05] font-extrabold text-balance"
        style={{ fontSize: "clamp(1.6rem, 6.5vw, 4.5rem)" }}
      >
        {wort}
      </span>
    </div>
  );
}

function LoesungsSpalte({
  name,
  farbe,
  paare,
  fehler,
  onToggle,
}: {
  name: string;
  farbe: string;
  paare: Paar[];
  fehler: number[];
  onToggle: (i: number) => void;
}) {
  return (
    <Panel>
      <header
        className="flex items-baseline justify-between gap-3 rounded-t-2xl border-b border-line px-5 py-3.5"
        style={{ background: `color-mix(in srgb, ${farbe} 10%, transparent)` }}
      >
        <h2 className="font-display font-bold" style={{ color: farbe }}>
          {name}
        </h2>
        <span className="text-sm text-muted">
          {fehler.length} Fehler
        </span>
      </header>
      <ul className="divide-y divide-line">
        {paare.map((paar, i) => {
          const falsch = fehler.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onToggle(i)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-surface-2"
                aria-pressed={falsch}
              >
                <span className="tnum w-6 shrink-0 text-sm text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-muted">
                    {paar.de}
                  </span>
                  <span
                    className={`block truncate font-display font-bold ${
                      falsch ? "line-through opacity-60" : ""
                    }`}
                  >
                    {paar.en}
                  </span>
                </span>
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg transition"
                  style={{
                    background: falsch
                      ? "color-mix(in srgb, var(--alert) 14%, transparent)"
                      : "transparent",
                    color: falsch ? "var(--alert)" : "var(--ink-muted)",
                  }}
                  title={falsch ? "Als richtig zählen" : "Als Fehler zählen"}
                >
                  <Icon name={falsch ? "x" : "check"} size={17} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
