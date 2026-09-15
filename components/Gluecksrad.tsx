"use client";

import { shortName } from "@/lib/classes";

/* Abwechselnde Segmentfarben rund um das Schulblau herum. */
const SEGMENTFARBEN = ["#2c5aa0", "#e9942c", "#1f7f87", "#6b57a8"];

const MITTE = 100;
const RADIUS = 94;

/** Punkt auf dem Kreis, Winkel von oben im Uhrzeigersinn gemessen. */
function punkt(winkel: number, radius: number) {
  const rad = ((winkel - 90) * Math.PI) / 180;
  return [MITTE + radius * Math.cos(rad), MITTE + radius * Math.sin(rad)];
}

function segmentPfad(von: number, bis: number): string {
  const [x1, y1] = punkt(von, RADIUS);
  const [x2, y2] = punkt(bis, RADIUS);
  const grosserBogen = bis - von > 180 ? 1 : 0;
  return `M ${MITTE} ${MITTE} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${grosserBogen} 1 ${x2} ${y2} Z`;
}

/**
 * Winkel, auf den das Rad gedreht werden muss, damit Segment `index`
 * unter dem Zeiger steht — immer vorwaerts vom aktuellen Stand aus,
 * damit sich die Drehrichtung nie umkehrt.
 */
export function zielDrehung(
  aktuell: number,
  index: number,
  anzahl: number,
  umdrehungen = 6,
): number {
  const breite = 360 / anzahl;
  // Nicht exakt mittig treffen, sonst wirkt jeder Lauf gleich.
  const streuung = (Math.random() - 0.5) * breite * 0.7;
  const mitte = (index + 0.5) * breite + streuung;
  const rest = (((-mitte - aktuell) % 360) + 360) % 360;
  return aktuell + umdrehungen * 360 + rest;
}

export function Gluecksrad({
  names,
  rotation,
  spinning,
  verbraucht = [],
  onSpinEnd,
}: {
  names: string[];
  rotation: number;
  spinning: boolean;
  /** Bereits gezogene Namen werden blasser dargestellt. */
  verbraucht?: string[];
  onSpinEnd: () => void;
}) {
  const anzahl = Math.max(1, names.length);
  const breite = 360 / anzahl;

  // Je mehr Namen, desto kleiner die Schrift — ab ~30 wird es eng.
  const schrift = anzahl <= 8 ? 8 : anzahl <= 16 ? 6.4 : anzahl <= 26 ? 5.2 : 4.2;
  const maxZeichen = anzahl <= 10 ? 14 : anzahl <= 20 ? 11 : 9;

  return (
    <div className="relative aspect-square w-[min(80vw,min(54vh,32rem))]">
      {/* Zeiger */}
      <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1">
        <svg viewBox="0 0 24 26" className="h-[clamp(1.5rem,4vh,2.25rem)] w-auto">
          <path
            d="M12 26 2 4a2 2 0 0 1 1.8-2.9h16.4A2 2 0 0 1 22 4z"
            fill="var(--lmg-orange)"
            stroke="var(--surface)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div
        className="size-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          /* Der Uebergang steht dauerhaft. Wuerde er erst zusammen mit
             dem neuen Winkel gesetzt, sieht der Browser beides in
             derselben Stilberechnung, springt ohne Animation ans Ziel
             und feuert nie ein transitionend. */
          transition: "transform 4.6s cubic-bezier(0.12, 0.72, 0.12, 1)",
          willChange: spinning ? "transform" : "auto",
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform") onSpinEnd();
        }}
      >
        <svg viewBox="0 0 200 200" className="size-full">
          {names.map((name, i) => {
            const von = i * breite;
            const bis = von + breite;
            const mitte = von + breite / 2;
            const blass = verbraucht.includes(name);
            // Auf der linken Haelfte laeuft die Schrift sonst kopfueber.
            const links = mitte > 180;

            return (
              <g key={`${name}-${i}`}>
                <path
                  d={anzahl === 1 ? "" : segmentPfad(von, bis)}
                  fill={SEGMENTFARBEN[i % SEGMENTFARBEN.length]}
                  opacity={blass ? 0.3 : 1}
                  stroke="var(--surface)"
                  strokeWidth="0.6"
                />
                {anzahl === 1 ? (
                  <circle
                    cx={MITTE}
                    cy={MITTE}
                    r={RADIUS}
                    fill={SEGMENTFARBEN[0]}
                  />
                ) : null}
                <text
                  transform={`rotate(${links ? mitte + 90 : mitte - 90} ${MITTE} ${MITTE})`}
                  x={links ? MITTE - 26 : MITTE + 26}
                  y={MITTE}
                  textAnchor={links ? "end" : "start"}
                  dominantBaseline="middle"
                  fontSize={schrift}
                  fontWeight={700}
                  fill="#ffffff"
                  opacity={blass ? 0.45 : 1}
                  style={{ letterSpacing: "0.01em" }}
                >
                  {shortName(name, maxZeichen)}
                </text>
              </g>
            );
          })}

          {/* Nabe */}
          <circle
            cx={MITTE}
            cy={MITTE}
            r="13"
            fill="var(--surface)"
            stroke="var(--line)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
