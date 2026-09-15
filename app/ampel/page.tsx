"use client";

import { useEffect, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Panel, Segmented } from "@/components/ui";
import { useStored } from "@/lib/storage";
import { useMicLevel } from "@/lib/useMicLevel";
import { useWakeLock } from "@/lib/hooks";
import { playAlert, unlockAudio } from "@/lib/audio";

type Betrieb = "mikro" | "hand";
type Lampe = "gruen" | "gelb" | "rot";

const LAMP_COLOR: Record<Lampe, string> = {
  gruen: "var(--ok)",
  gelb: "var(--warn)",
  rot: "var(--alert)",
};

const LAMP_TEXT: Record<Lampe, { titel: string; unter: string }> = {
  gruen: { titel: "Gut so", unter: "Arbeitslautstärke" },
  gelb: { titel: "Etwas leiser", unter: "Wird langsam laut" },
  rot: { titel: "Zu laut", unter: "Bitte Flüsterton" },
};

export default function AmpelPage() {
  const [betrieb, setBetrieb] = useState<Betrieb>("mikro");
  const [sensitivity, setSensitivity] = useStored("ampel.sens", 1);
  const [gelbAb, setGelbAb] = useStored("ampel.gelb", 0.34);
  const [rotAb, setRotAb] = useStored("ampel.rot", 0.56);
  const [handLampe, setHandLampe] = useState<Lampe>("gruen");
  const [ton, setTon] = useState(false);
  const [belohnung, setBelohnung] = useStored("ampel.belohnung", true);
  const [zeigeEinstellungen, setZeigeEinstellungen] = useState(false);

  const { state, level, start, stop } = useMicLevel(sensitivity);

  const lampe: Lampe =
    betrieb === "hand"
      ? handLampe
      : level >= rotAb
        ? "rot"
        : level >= gelbAb
          ? "gelb"
          : "gruen";

  useWakeLock(state === "an" || betrieb === "hand");

  /* Ruhe-Punkte: fuellt sich, solange die Klasse im gruenen Bereich bleibt. */
  const [gruenSekunden, setGruenSekunden] = useState(0);
  const ZIEL = 300; // fuenf Minuten
  useEffect(() => {
    if (!belohnung) return;
    if (betrieb === "mikro" && state !== "an") return;
    const id = window.setInterval(() => {
      setGruenSekunden((s) =>
        lampe === "gruen" ? Math.min(ZIEL, s + 1) : Math.max(0, s - 2),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [lampe, belohnung, betrieb, state]);

  /* Beim Sprung auf Rot einmal dezent hinweisen, nicht dauerhaft piepen. */
  const letzteLampe = useRef<Lampe>("gruen");
  useEffect(() => {
    if (ton && lampe === "rot" && letzteLampe.current !== "rot") playAlert();
    letzteLampe.current = lampe;
  }, [lampe, ton]);

  const aktiv = betrieb === "hand" || state === "an";

  return (
    <ToolShell slug="ampel" bleed>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-8 lg:flex-row lg:gap-16">
        {/* ---------- Ampelgehäuse ---------- */}
        <div
          className="flex shrink-0 flex-col gap-4 rounded-[2.5rem] p-5 sm:gap-6 sm:p-7"
          style={{
            background: "color-mix(in srgb, var(--ink) 88%, transparent)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {(["rot", "gelb", "gruen"] as Lampe[]).map((l) => {
            const an = aktiv && lampe === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setBetrieb("hand");
                  setHandLampe(l);
                }}
                aria-label={`Ampel auf ${l} stellen`}
                aria-pressed={an}
                className="size-[clamp(5rem,17vh,10rem)] rounded-full transition-all duration-300"
                style={{
                  background: an ? LAMP_COLOR[l] : "rgb(255 255 255 / 0.07)",
                  boxShadow: an
                    ? `0 0 60px 8px color-mix(in srgb, ${LAMP_COLOR[l]} 55%, transparent)`
                    : "inset 0 2px 10px rgb(0 0 0 / 0.35)",
                }}
              />
            );
          })}
        </div>

        {/* ---------- Text und Pegel ---------- */}
        <div className="w-full max-w-2xl">
          {aktiv ? (
            <>
              <p
                className="font-display leading-none font-extrabold"
                style={{
                  color: LAMP_COLOR[lampe],
                  fontSize: "clamp(2.75rem, 8vw, 6rem)",
                  letterSpacing: "-0.035em",
                }}
              >
                {LAMP_TEXT[lampe].titel}
              </p>
              <p className="mt-3 text-xl text-muted sm:text-2xl">
                {LAMP_TEXT[lampe].unter}
              </p>
            </>
          ) : (
            <MicHinweis state={state} onStart={() => void start()} />
          )}

          {betrieb === "mikro" && state === "an" ? (
            <div className="mt-8">
              <div className="relative h-5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-out"
                  style={{
                    width: `${Math.min(100, level * 100)}%`,
                    background: LAMP_COLOR[lampe],
                  }}
                />
                <span
                  className="absolute top-0 h-full w-px bg-[var(--warn)] opacity-60"
                  style={{ left: `${gelbAb * 100}%` }}
                />
                <span
                  className="absolute top-0 h-full w-px bg-[var(--alert)] opacity-60"
                  style={{ left: `${rotAb * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">
                Aktueller Raumpegel — die Striche sind deine Schwellen.
              </p>
            </div>
          ) : null}

          {belohnung && aktiv ? (
            <div className="mt-8">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
                  Ruhe-Punkte
                </span>
                <span className="tnum text-sm font-semibold text-muted">
                  {Math.floor(gruenSekunden / 60)}:
                  {String(gruenSekunden % 60).padStart(2, "0")} / 5:00
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${(gruenSekunden / ZIEL) * 100}%`,
                    background: "var(--ok)",
                  }}
                />
              </div>
              {gruenSekunden >= ZIEL ? (
                <p
                  className="mt-2 font-display text-lg font-bold"
                  style={{ color: "var(--ok)" }}
                >
                  Geschafft — fünf Minuten am Stück.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------- Bedienung ---------- */}
      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <Segmented<Betrieb>
            value={betrieb}
            onChange={(b) => {
              setBetrieb(b);
              if (b === "hand") stop();
            }}
            options={[
              { value: "mikro", label: "Mikrofon", icon: "mic" },
              { value: "hand", label: "Von Hand", icon: "traffic" },
            ]}
          />

          {betrieb === "mikro" ? (
            state === "an" ? (
              <Button variant="outline" icon="x" onClick={stop}>
                Mikrofon aus
              </Button>
            ) : (
              <Button
                variant="primary"
                icon="mic"
                onClick={() => {
                  unlockAudio();
                  void start();
                }}
                disabled={state === "startet"}
              >
                {state === "startet" ? "Startet …" : "Mikrofon einschalten"}
              </Button>
            )
          ) : null}

          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setTon((t) => !t);
            }}
            className={`grid size-11 place-items-center rounded-xl border transition ${
              ton ? "border-transparent bg-surface-2 text-ink" : "border-line text-muted"
            }`}
            title={ton ? "Hinweiston an" : "Hinweiston aus"}
            aria-label={ton ? "Hinweiston ausschalten" : "Hinweiston einschalten"}
          >
            <Icon name="volume" size={18} />
          </button>

          <Button
            variant="ghost"
            onClick={() => setZeigeEinstellungen((s) => !s)}
          >
            Schwellen einstellen
          </Button>
        </div>

        {zeigeEinstellungen ? (
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-5">
            <Panel className="p-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <Regler
                  label="Empfindlichkeit"
                  value={sensitivity}
                  min={0.4}
                  max={2.5}
                  onChange={setSensitivity}
                  hint="Großer, halliger Raum? Höher stellen."
                />
                <Regler
                  label="Gelb ab"
                  value={gelbAb}
                  min={0.1}
                  max={0.8}
                  onChange={(v) => setGelbAb(Math.min(v, rotAb - 0.05))}
                />
                <Regler
                  label="Rot ab"
                  value={rotAb}
                  min={0.15}
                  max={0.95}
                  onChange={(v) => setRotAb(Math.max(v, gelbAb + 0.05))}
                />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-[0.9rem]">
                  <input
                    type="checkbox"
                    checked={belohnung}
                    onChange={(e) => setBelohnung(e.target.checked)}
                    className="size-4 accent-[var(--ok)]"
                  />
                  Ruhe-Punkte anzeigen
                </label>
                <button
                  type="button"
                  onClick={() => setGruenSekunden(0)}
                  className="text-[0.9rem] font-medium text-muted underline underline-offset-2 hover:text-ink"
                >
                  Punkte zurücksetzen
                </button>
                <p className="text-[0.85rem] text-muted">
                  Es wird ausschließlich die Lautstärke gemessen. Nichts wird
                  aufgezeichnet oder übertragen.
                </p>
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}

function Regler({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between">
        <span className="text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
          {label}
        </span>
        <span className="tnum text-sm text-muted">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      {hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

function MicHinweis({
  state,
  onStart,
}: {
  state: string;
  onStart: () => void;
}) {
  if (state === "verweigert") {
    return (
      <div>
        <h2 className="font-display text-3xl font-bold" style={{ color: "var(--alert)" }}>
          Kein Zugriff aufs Mikrofon
        </h2>
        <p className="mt-3 max-w-lg text-lg leading-relaxed text-muted">
          Der Browser hat die Anfrage blockiert. In der Adressleiste links auf
          das Schloss tippen, Mikrofon erlauben, Seite neu laden. Oder oben auf
          „Von Hand“ umschalten.
        </p>
      </div>
    );
  }

  if (state === "fehler") {
    return (
      <div>
        <h2 className="font-display text-3xl font-bold">
          Mikrofon nicht gefunden
        </h2>
        <p className="mt-3 max-w-lg text-lg leading-relaxed text-muted">
          An diesem Rechner ist kein Mikrofon verfügbar. Die Ampel lässt sich
          trotzdem von Hand stellen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-4xl leading-tight font-extrabold sm:text-5xl">
        Hört mit,
        <br />
        <span style={{ color: "var(--ok)" }}>speichert nichts.</span>
      </h2>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
        Die Ampel misst nur, wie laut es im Raum ist, und färbt sich danach.
        Der Ton wird nicht aufgezeichnet und verlässt diesen Rechner nicht.
      </p>
      <Button variant="primary" size="lg" icon="mic" onClick={onStart} className="mt-6">
        Mikrofon einschalten
      </Button>
    </div>
  );
}
