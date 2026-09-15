"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Kbd, Segmented } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";

type Punkt = { x: number; y: number };
type Strich = { farbe: string; breite: number; punkte: Punkt[] };
type Untergrund = "leer" | "raster" | "linien";

const FARBEN = [
  { name: "Schulblau", wert: "#2c5aa0" },
  { name: "Orange", wert: "#e9942c" },
  { name: "Schwarz", wert: "#1b2333" },
  { name: "Rot", wert: "#c23f36" },
  { name: "Grün", wert: "#2f8757" },
];

const BREITEN = [3, 7, 16];

export default function TafelPage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stricheRef = useRef<Strich[]>([]);
  const aktuellRef = useRef<Strich | null>(null);

  const [farbe, setFarbe] = useState(FARBEN[0].wert);
  const [breite, setBreite] = useState(BREITEN[1]);
  const [radierer, setRadierer] = useState(false);
  const [untergrund, setUntergrund] = useState<Untergrund>("leer");
  const [anzahl, setAnzahl] = useState(0);

  /* Abdeckung: zieht einen Vorhang über die Tafel, der schrittweise
     nach unten gezogen wird — für Lösungen, die nacheinander kommen. */
  const [abdeckung, setAbdeckung] = useState(false);
  const [vorhang, setVorhang] = useState(35);

  /** Alles neu malen — nach Resize, Undo, Untergrundwechsel. */
  const zeichneNeu = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = wrap.getBoundingClientRect();
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    /* Untergrund */
    const linienFarbe = getComputedStyle(document.documentElement)
      .getPropertyValue("--line")
      .trim();
    if (untergrund !== "leer") {
      ctx.strokeStyle = linienFarbe || "#dfe4ec";
      ctx.lineWidth = 1;
      const abstand = 44;
      ctx.beginPath();
      for (let y = abstand; y < height; y += abstand) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      if (untergrund === "raster") {
        for (let x = abstand; x < width; x += abstand) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
      }
      ctx.stroke();
    }

    /* Striche — normalisiert gespeichert, damit Resize nichts abschneidet */
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const alle = aktuellRef.current
      ? [...stricheRef.current, aktuellRef.current]
      : stricheRef.current;

    for (const strich of alle) {
      if (strich.punkte.length === 0) continue;
      ctx.strokeStyle = strich.farbe;
      ctx.lineWidth = strich.breite;
      ctx.globalCompositeOperation =
        strich.farbe === "erase" ? "destination-out" : "source-over";
      if (strich.farbe === "erase") ctx.strokeStyle = "rgba(0,0,0,1)";

      ctx.beginPath();
      const [erst, ...rest] = strich.punkte;
      ctx.moveTo(erst.x * width, erst.y * height);
      for (const p of rest) ctx.lineTo(p.x * width, p.y * height);
      if (rest.length === 0) ctx.lineTo(erst.x * width + 0.1, erst.y * height);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, [untergrund]);

  useEffect(() => {
    zeichneNeu();
    const ro = new ResizeObserver(() => zeichneNeu());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [zeichneNeu]);

  function position(e: React.PointerEvent): Punkt {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function beginnen(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    aktuellRef.current = {
      farbe: radierer ? "erase" : farbe,
      breite: radierer ? breite * 3.5 : breite,
      punkte: [position(e)],
    };
    zeichneNeu();
  }

  function ziehen(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!aktuellRef.current) return;
    aktuellRef.current.punkte.push(position(e));
    zeichneNeu();
  }

  function beenden() {
    if (!aktuellRef.current) return;
    stricheRef.current = [...stricheRef.current, aktuellRef.current];
    aktuellRef.current = null;
    setAnzahl(stricheRef.current.length);
    zeichneNeu();
  }

  const zurueck = useCallback(() => {
    stricheRef.current = stricheRef.current.slice(0, -1);
    setAnzahl(stricheRef.current.length);
    zeichneNeu();
  }, [zeichneNeu]);

  const leeren = useCallback(() => {
    stricheRef.current = [];
    aktuellRef.current = null;
    setAnzahl(0);
    zeichneNeu();
  }, [zeichneNeu]);

  useHotkeys({
    z: zurueck,
    e: () => setRadierer((r) => !r),
  });

  return (
    <ToolShell
      slug="tafel"
      bleed
      hint={
        <>
          <Kbd>Z</Kbd> zurück <Kbd>E</Kbd> Radierer
        </>
      }
    >
      <div ref={wrapRef} className="relative flex-1 touch-none bg-surface">
        <canvas
          ref={canvasRef}
          onPointerDown={beginnen}
          onPointerMove={ziehen}
          onPointerUp={beenden}
          onPointerLeave={beenden}
          className="absolute inset-0 cursor-crosshair"
        />

        {abdeckung ? (
          <>
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: `${vorhang}%`,
                background: "var(--lmg-blue)",
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={vorhang}
              onChange={(e) => setVorhang(Number(e.target.value))}
              aria-label="Abdeckung verschieben"
              className="absolute inset-x-0 z-10 h-8 w-full cursor-ns-resize opacity-0"
              style={{ top: `calc(${vorhang}% - 1rem)` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 flex items-center justify-center"
              style={{ top: `calc(${vorhang}% - 0.75rem)` }}
            >
              <span className="flex h-6 items-center gap-1.5 rounded-full bg-[var(--lmg-orange)] px-3 text-[0.7rem] font-bold text-white shadow-[var(--shadow-md)]">
                ZIEHEN
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <div className="flex items-center gap-1.5">
            {FARBEN.map((f) => (
              <button
                key={f.wert}
                type="button"
                onClick={() => {
                  setFarbe(f.wert);
                  setRadierer(false);
                }}
                className={`size-9 rounded-full border-2 transition ${
                  farbe === f.wert && !radierer
                    ? "scale-110 border-ink"
                    : "border-transparent"
                }`}
                style={{ background: f.wert }}
                title={f.name}
                aria-label={f.name}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {BREITEN.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBreite(b)}
                className={`grid size-9 place-items-center rounded-lg border transition ${
                  breite === b ? "border-transparent bg-surface-2" : "border-line"
                }`}
                title={`Strichstärke ${b}`}
                aria-label={`Strichstärke ${b}`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{ width: b + 2, height: b + 2 }}
                />
              </button>
            ))}
          </div>

          <Button
            variant={radierer ? "primary" : "outline"}
            icon="eraser"
            onClick={() => setRadierer((r) => !r)}
          >
            Radierer
          </Button>

          <Button variant="ghost" icon="reset" onClick={zurueck} disabled={anzahl === 0}>
            Zurück
          </Button>
          <Button variant="ghost" icon="trash" onClick={leeren} disabled={anzahl === 0}>
            Alles weg
          </Button>

          <Segmented<Untergrund>
            size="sm"
            value={untergrund}
            onChange={setUntergrund}
            options={[
              { value: "leer", label: "Leer" },
              { value: "linien", label: "Linien" },
              { value: "raster", label: "Raster" },
            ]}
          />

          <button
            type="button"
            onClick={() => setAbdeckung((a) => !a)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[0.9rem] font-medium transition ${
              abdeckung ? "border-transparent text-white" : "border-line text-muted hover:text-ink"
            }`}
            style={abdeckung ? { background: "var(--lmg-blue)" } : undefined}
            title="Deckt den oberen Teil ab — zum schrittweisen Aufdecken"
          >
            <Icon name="eye" size={17} />
            Abdecken
          </button>
        </div>
      </div>
    </ToolShell>
  );
}
