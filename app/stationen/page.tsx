"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Kbd, Panel, Stepper } from "@/components/ui";
import { formatClock, useHotkeys, useNow, useWakeLock } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import { playGong, playTick, unlockAudio } from "@/lib/audio";

type Station = { name: string; minuten: number };
type Abschnitt = "station" | "wechsel" | "fertig";

const VORLAGEN: Record<string, { label: string; stationen: Station[] }> = {
  stationen: {
    label: "Stationenlauf",
    stationen: [
      { name: "Station 1", minuten: 8 },
      { name: "Station 2", minuten: 8 },
      { name: "Station 3", minuten: 8 },
      { name: "Station 4", minuten: 8 },
    ],
  },
  tps: {
    label: "Think — Pair — Share",
    stationen: [
      { name: "Think — allein denken", minuten: 2 },
      { name: "Pair — zu zweit austauschen", minuten: 4 },
      { name: "Share — im Plenum vorstellen", minuten: 6 },
    ],
  },
  placemat: {
    label: "Placemat",
    stationen: [
      { name: "Eigener Randbereich", minuten: 4 },
      { name: "Im Uhrzeigersinn lesen", minuten: 3 },
      { name: "Gemeinsame Mitte", minuten: 6 },
    ],
  },
};

export default function StationenPage() {
  const [stationen, setStationen] = useStored<Station[]>(
    "stationen.liste",
    VORLAGEN.stationen.stationen,
  );
  const [wechselSekunden, setWechselSekunden] = useStored(
    "stationen.wechsel",
    20,
  );
  const [bearbeiten, setBearbeiten] = useState(false);

  const [idx, setIdx] = useState(0);
  const [abschnitt, setAbschnitt] = useState<Abschnitt>("station");
  const [deadline, setDeadline] = useState<number | null>(null);
  const [rest, setRest] = useState((stationen[0]?.minuten ?? 8) * 60_000);

  const laeuft = deadline !== null;
  const now = useNow(laeuft ? 100 : 1000);
  useWakeLock(laeuft);

  const restMs = laeuft && now > 0 ? Math.max(0, deadline - now) : rest;

  const dauerMs =
    abschnitt === "wechsel"
      ? wechselSekunden * 1000
      : (stationen[idx]?.minuten ?? 1) * 60_000;

  /* --- Übergänge --- */
  const weiter = useCallback(
    (auto: boolean) => {
      if (abschnitt === "station") {
        const letzte = idx >= stationen.length - 1;
        if (letzte) {
          setAbschnitt("fertig");
          setDeadline(null);
          setRest(0);
          if (auto) playGong();
          return;
        }
        setAbschnitt("wechsel");
        const ms = wechselSekunden * 1000;
        setRest(ms);
        setDeadline(auto ? Date.now() + ms : null);
        if (auto) playGong();
      } else if (abschnitt === "wechsel") {
        const next = idx + 1;
        setIdx(next);
        setAbschnitt("station");
        const ms = (stationen[next]?.minuten ?? 1) * 60_000;
        setRest(ms);
        setDeadline(auto ? Date.now() + ms : null);
        if (auto) playGong();
      }
    },
    [abschnitt, idx, stationen, wechselSekunden],
  );

  /* Den Wechsel terminieren statt ihn aus der Anzeige abzuleiten —
     so haengt die Schaltung nicht am Rendertakt. */
  useEffect(() => {
    if (deadline === null) return;
    const id = window.setTimeout(
      () => weiter(true),
      Math.max(0, deadline - Date.now()),
    );
    return () => window.clearTimeout(id);
  }, [deadline, weiter]);

  /* Letzte Sekunden hörbar machen */
  const letzteSekunde = useRef(-1);
  useEffect(() => {
    if (!laeuft) return;
    const sec = Math.ceil(restMs / 1000);
    if (sec === letzteSekunde.current) return;
    letzteSekunde.current = sec;
    if (sec <= 5 && sec > 0 && abschnitt === "station") playTick(sec <= 3);
  }, [restMs, laeuft, abschnitt]);

  const start = useCallback(() => {
    unlockAudio();
    if (abschnitt === "fertig") {
      setIdx(0);
      setAbschnitt("station");
      setRest((stationen[0]?.minuten ?? 8) * 60_000);
      setDeadline(Date.now() + (stationen[0]?.minuten ?? 8) * 60_000);
      return;
    }
    setDeadline(Date.now() + rest);
  }, [abschnitt, rest, stationen]);

  const pause = useCallback(() => {
    if (deadline === null) return;
    setRest(Math.max(0, deadline - Date.now()));
    setDeadline(null);
  }, [deadline]);

  const zuruecksetzen = useCallback(() => {
    setIdx(0);
    setAbschnitt("station");
    setDeadline(null);
    setRest((stationen[0]?.minuten ?? 8) * 60_000);
    letzteSekunde.current = -1;
  }, [stationen]);

  useHotkeys({
    " ": () => (laeuft ? pause() : start()),
    r: zuruecksetzen,
    ArrowRight: () => weiter(false),
  });

  const gesamt = stationen.reduce((s, st) => s + st.minuten, 0);
  const farbe =
    abschnitt === "wechsel"
      ? "var(--lmg-orange)"
      : abschnitt === "fertig"
        ? "var(--ok)"
        : "var(--a-teal)";
  const fortschritt = dauerMs > 0 ? 1 - restMs / dauerMs : 0;

  return (
    <ToolShell
      slug="stationen"
      bleed
      hint={
        <>
          <Kbd>Leer</Kbd> Start <Kbd>→</Kbd> weiter
        </>
      }
    >
      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center transition-colors duration-500"
        style={{ background: `color-mix(in srgb, ${farbe} 7%, transparent)` }}
      >
        {abschnitt === "fertig" ? (
          <>
            <h2
              className="font-display font-extrabold"
              style={{ color: farbe, fontSize: "clamp(2.5rem, 9vw, 7rem)" }}
            >
              Durch.
            </h2>
            <p className="text-xl text-muted sm:text-2xl">
              Alle {stationen.length} Stationen sind gelaufen.
            </p>
          </>
        ) : abschnitt === "wechsel" ? (
          <>
            <Icon
              name="rotate"
              size={96}
              style={{ color: farbe }}
              className="animate-[spin_3s_linear_infinite]"
            />
            <h2
              className="font-display leading-none font-extrabold"
              style={{
                color: farbe,
                fontSize: "clamp(2.5rem, 9vw, 7rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Weiterrotieren
            </h2>
            <p className="tnum font-display text-5xl font-bold sm:text-7xl">
              {formatClock(restMs / 1000)}
            </p>
            <p className="text-lg text-muted sm:text-xl">
              Danach: {stationen[idx + 1]?.name}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold tracking-wide text-muted uppercase">
              Station {idx + 1} von {stationen.length}
            </p>
            <h2
              className="max-w-5xl font-display leading-[1.05] font-extrabold text-balance"
              style={{
                color: farbe,
                fontSize: "clamp(1.9rem, 5.5vw, 4.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              {stationen[idx]?.name}
            </h2>
            <p
              className="tnum font-display leading-none font-extrabold"
              style={{
                fontSize: "clamp(3.5rem, 15vw, 13rem)",
                letterSpacing: "-0.045em",
              }}
            >
              {formatClock(restMs / 1000)}
            </p>
          </>
        )}

        {abschnitt !== "fertig" ? (
          <div className="h-3 w-[min(80vw,48rem)] overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{
                width: `${Math.min(100, Math.max(0, fortschritt * 100))}%`,
                background: farbe,
              }}
            />
          </div>
        ) : null}

        {/* Laufleiste aller Stationen */}
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {stationen.map((s, i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === idx && abschnitt !== "fertig" ? "3rem" : "1.5rem",
                background:
                  i < idx || abschnitt === "fertig"
                    ? farbe
                    : i === idx
                      ? farbe
                      : "var(--line-strong)",
                opacity: i > idx && abschnitt !== "fertig" ? 0.5 : 1,
              }}
              title={s.name}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <Button
            variant="primary"
            size="lg"
            icon={laeuft ? "pause" : "play"}
            onClick={laeuft ? pause : start}
            className="min-w-40"
          >
            {laeuft ? "Pause" : abschnitt === "fertig" ? "Nochmal" : "Start"}
          </Button>
          <Button variant="outline" size="lg" icon="reset" onClick={zuruecksetzen}>
            Zurück
          </Button>
          <Button
            variant="soft"
            size="lg"
            onClick={() => weiter(false)}
            disabled={abschnitt === "fertig"}
          >
            Weiter →
          </Button>
          <Button
            variant="ghost"
            icon="pen"
            onClick={() => setBearbeiten((b) => !b)}
          >
            {stationen.length} Stationen · {gesamt} Min
          </Button>
        </div>

        {bearbeiten ? (
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-5">
            <Panel className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[0.8rem] font-semibold text-muted uppercase">
                  Vorlage
                </span>
                {Object.entries(VORLAGEN).map(([key, v]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStationen(v.stationen);
                      zuruecksetzen();
                    }}
                  >
                    {v.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                {stationen.map((station, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold text-muted">
                      {i + 1}
                    </span>
                    <input
                      value={station.name}
                      onChange={(e) =>
                        setStationen((prev) =>
                          prev.map((s, j) =>
                            j === i ? { ...s, name: e.target.value } : s,
                          ),
                        )
                      }
                      className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3.5 outline-none"
                      aria-label={`Name Station ${i + 1}`}
                    />
                    <Stepper
                      value={station.minuten}
                      min={1}
                      max={90}
                      suffix="Min"
                      onChange={(v) =>
                        setStationen((prev) =>
                          prev.map((s, j) =>
                            j === i ? { ...s, minuten: v } : s,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setStationen((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"
                      aria-label={`Station ${i + 1} entfernen`}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
                <Button
                  variant="soft"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setStationen((prev) => [
                      ...prev,
                      { name: `Station ${prev.length + 1}`, minuten: 8 },
                    ])
                  }
                >
                  Station hinzufügen
                </Button>
                <label className="flex items-center gap-2.5 text-[0.9rem]">
                  <span className="text-muted">Zeit zum Wechseln</span>
                  <Stepper
                    value={wechselSekunden}
                    onChange={setWechselSekunden}
                    min={0}
                    max={180}
                    step={5}
                    suffix="Sek"
                  />
                </label>
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
