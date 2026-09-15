"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Kbd, Segmented, Stepper } from "@/components/ui";
import { formatClock, useHotkeys, useNow, useWakeLock } from "@/lib/hooks";
import { playGong, playTick, unlockAudio } from "@/lib/audio";

type Mode = "countdown" | "stoppuhr";
type Look = "ziffern" | "ring" | "still";

const PRESETS = [1, 2, 3, 5, 10, 15, 20];

export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <Timer />
    </Suspense>
  );
}

function Timer() {
  const params = useSearchParams();

  // Aus der URL vorbelegen: /timer?min=5&look=ring
  const initialMinutes = clampMinutes(Number(params.get("min")) || 5);
  const initialMode: Mode =
    params.get("mode") === "stoppuhr" ? "stoppuhr" : "countdown";
  const lookParam = params.get("look");
  const initialLook: Look =
    lookParam === "ring" || lookParam === "still" ? lookParam : "ziffern";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [look, setLook] = useState<Look>(initialLook);
  const [sound, setSound] = useState(true);
  const [minutes, setMinutes] = useState(initialMinutes);

  /* Countdown haelt einen Zeitstempel, keinen herunterzaehlenden Wert —
     so bleibt die Anzeige korrekt, auch wenn der Tab gedrosselt wird. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [restMs, setRestMs] = useState(initialMinutes * 60_000);

  /* Stoppuhr */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);

  /* `laeuft` = eine Uhr ist gestartet; `running` = sie zaehlt auch noch.
     Der Countdown haelt sich selbst an, wenn die Frist erreicht ist —
     dafuer braucht es kein setState im Effect. */
  const laeuft = mode === "countdown" ? deadline !== null : startedAt !== null;
  const now = useNow(laeuft ? 100 : 1000);

  const abgelaufen =
    mode === "countdown" && deadline !== null && now > 0 && now >= deadline;
  const running = laeuft && !abgelaufen;
  useWakeLock(running);

  const remainingMs =
    mode === "countdown"
      ? deadline !== null
        ? Math.max(0, deadline - now)
        : restMs
      : 0;
  const elapsedMs =
    accumulated + (startedAt !== null && now > 0 ? now - startedAt : 0);

  const totalMs = minutes * 60_000;

  /* --- Gong und Vorwarnung --- */
  const lastSecondRef = useRef<number>(-1);
  useEffect(() => {
    if (mode !== "countdown" || !running) return;
    const sec = Math.ceil(remainingMs / 1000);
    if (sec === lastSecondRef.current) return;
    lastSecondRef.current = sec;
    if (!sound) return;
    if (sec <= 5 && sec > 0) playTick(sec <= 3);
  }, [remainingMs, running, mode, sound]);

  /* Genau einmal gongen, wenn die Zeit durch ist. */
  const gongGespielt = useRef(false);
  useEffect(() => {
    if (!abgelaufen) {
      gongGespielt.current = false;
      return;
    }
    if (gongGespielt.current) return;
    gongGespielt.current = true;
    if (sound) playGong();
  }, [abgelaufen, sound]);

  /* --- Steuerung --- */
  const start = useCallback(() => {
    unlockAudio();
    if (mode === "countdown") {
      const offen =
        deadline !== null ? Math.max(0, deadline - Date.now()) : restMs;
      const ms = offen > 0 ? offen : totalMs;
      setRestMs(ms);
      setDeadline(Date.now() + ms);
    } else {
      setStartedAt(Date.now());
    }
  }, [mode, deadline, restMs, totalMs]);

  const pause = useCallback(() => {
    if (mode === "countdown") {
      if (deadline === null) return;
      setRestMs(Math.max(0, deadline - Date.now()));
      setDeadline(null);
    } else {
      if (startedAt === null) return;
      setAccumulated((a) => a + (Date.now() - startedAt));
      setStartedAt(null);
    }
  }, [mode, deadline, startedAt]);

  const toggle = useCallback(() => {
    if (running) pause();
    else start();
  }, [running, pause, start]);

  const reset = useCallback(() => {
    setDeadline(null);
    setStartedAt(null);
    setAccumulated(0);
    setRestMs(totalMs);
    lastSecondRef.current = -1;
  }, [totalMs]);

  /** Waehrend des Laufs eine Minute drauflegen — der haeufigste Wunsch. */
  const addMinute = useCallback(() => {
    if (mode !== "countdown") return;
    if (deadline !== null) setDeadline(deadline + 60_000);
    else setRestMs((r) => r + 60_000);
  }, [mode, deadline]);

  function applyPreset(min: number) {
    setMinutes(min);
    setDeadline(null);
    setRestMs(min * 60_000);
    lastSecondRef.current = -1;
  }

  function changeMinutes(min: number) {
    const m = clampMinutes(min);
    setMinutes(m);
    if (deadline === null) setRestMs(m * 60_000);
  }

  useHotkeys({
    " ": toggle,
    r: reset,
    R: reset,
    Enter: toggle,
    ArrowUp: addMinute,
  });

  /* --- Darstellung --- */
  const displayMs = mode === "countdown" ? remainingMs : elapsedMs;
  const progress =
    mode === "countdown" && totalMs > 0
      ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs))
      : 0;

  const urgency: "calm" | "warn" | "alert" =
    mode !== "countdown" || deadline === null
      ? "calm"
      : remainingMs <= 10_000
        ? "alert"
        : remainingMs <= totalMs * 0.2
          ? "warn"
          : "calm";

  const color =
    urgency === "alert"
      ? "var(--alert)"
      : urgency === "warn"
        ? "var(--lmg-orange)"
        : "var(--lmg-blue)";

  const done = abgelaufen;

  return (
    <ToolShell
      slug="timer"
      bleed
      hint={
        <>
          <Kbd>Leer</Kbd> Start <Kbd>R</Kbd> Zurück <Kbd>↑</Kbd> +1 Min
        </>
      }
    >
      {/* ---------- Bühne ---------- */}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        {look !== "ziffern" ? (
          <RingDisplay
            progress={mode === "countdown" ? progress : 0}
            color={color}
            label={formatClock(displayMs / 1000)}
            showDigits={look === "ring"}
            pulse={done}
            caption={done ? "Zeit ist um." : undefined}
          />
        ) : (
          <div className="text-center">
            <div
              className={`tnum font-display leading-none font-extrabold tabular-nums transition-colors duration-500 ${
                done ? "animate-pulse" : ""
              }`}
              style={{
                color,
                fontSize: "clamp(5rem, 21vw, 20rem)",
                letterSpacing: "-0.045em",
              }}
            >
              {formatClock(displayMs / 1000)}
            </div>
            {mode === "countdown" ? (
              <div className="mx-auto mt-8 h-2.5 w-[min(70vw,42rem)] overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width] duration-200 ease-linear"
                  style={{
                    width: `${progress * 100}%`,
                    background: color,
                  }}
                />
              </div>
            ) : null}
            {done ? (
              <p
                className="mt-6 font-display text-2xl font-bold"
                style={{ color: "var(--alert)" }}
              >
                Zeit ist um.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ---------- Bedienung ---------- */}
      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-x-6 gap-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={running ? "pause" : "play"}
              onClick={toggle}
              className="min-w-40"
            >
              {running ? "Pause" : done ? "Nochmal" : "Start"}
            </Button>
            <Button variant="outline" size="lg" icon="reset" onClick={reset}>
              Zurück
            </Button>
            {mode === "countdown" ? (
              <Button variant="soft" size="lg" onClick={addMinute}>
                +1 Min
              </Button>
            ) : null}
          </div>

          <div className="h-8 w-px bg-line max-lg:hidden" />

          {mode === "countdown" ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`h-10 min-w-12 rounded-xl px-3 text-[0.9rem] font-semibold transition ${
                    minutes === p
                      ? "text-white"
                      : "border border-line text-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                  style={
                    minutes === p ? { background: "var(--lmg-blue)" } : undefined
                  }
                >
                  {p}
                </button>
              ))}
              <Stepper
                value={minutes}
                onChange={changeMinutes}
                min={1}
                max={180}
                suffix="Min"
              />
            </div>
          ) : null}

          <div className="h-8 w-px bg-line max-lg:hidden" />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Segmented<Mode>
              size="sm"
              value={mode}
              onChange={(m) => {
                setMode(m);
                reset();
              }}
              options={[
                { value: "countdown", label: "Countdown", icon: "timer" },
                { value: "stoppuhr", label: "Stoppuhr", icon: "clock" },
              ]}
            />
            <Segmented<Look>
              size="sm"
              value={look}
              onChange={setLook}
              options={[
                { value: "ziffern", label: "Ziffern" },
                { value: "ring", label: "Ring" },
                { value: "still", label: "Ohne Zahlen" },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setSound((s) => !s);
              }}
              className={`grid size-9 place-items-center rounded-lg border transition ${
                sound
                  ? "border-transparent bg-surface-2 text-ink"
                  : "border-line text-muted"
              }`}
              title={sound ? "Ton an" : "Ton aus"}
              aria-label={sound ? "Ton ausschalten" : "Ton einschalten"}
            >
              <Icon name="volume" size={17} />
            </button>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

function clampMinutes(m: number) {
  if (!Number.isFinite(m)) return 5;
  return Math.min(180, Math.max(1, Math.round(m)));
}

/**
 * Schrumpfender Ring — fuer Unterstufe und Foerderbedarf oft ruhiger
 * als eine tickende Ziffernanzeige.
 */
export function RingDisplay({
  progress,
  color,
  label,
  showDigits = true,
  pulse = false,
  caption,
}: {
  progress: number;
  color: string;
  label: string;
  showDigits?: boolean;
  pulse?: boolean;
  caption?: string;
}) {
  const R = 44;
  const circumference = 2 * Math.PI * R;
  const offset = circumference * progress;

  return (
    <div
      className={`relative aspect-square w-[min(80vw,min(70vh,34rem))] ${pulse ? "animate-pulse" : ""}`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="9"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear, stroke 500ms" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          {showDigits ? (
            <div
              className="tnum font-display font-extrabold"
              style={{
                color,
                fontSize: "clamp(2.5rem, 9vw, 6rem)",
                letterSpacing: "-0.04em",
              }}
            >
              {label}
            </div>
          ) : null}
          {caption ? (
            <div className="mt-1 text-lg font-semibold text-muted">
              {caption}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
