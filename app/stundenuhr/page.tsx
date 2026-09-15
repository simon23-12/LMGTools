"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Panel } from "@/components/ui";
import { formatClock, useNow, useWakeLock } from "@/lib/hooks";
import { useStored } from "@/lib/storage";

type Block = {
  name: string;
  von: string;
  bis: string;
  pause?: boolean;
};

/** Uebliches Raster eines Gymnasiums — pro Schule anpassbar. */
const STANDARD: Block[] = [
  { name: "1. Stunde", von: "08:00", bis: "08:45" },
  { name: "2. Stunde", von: "08:45", bis: "09:30" },
  { name: "Große Pause", von: "09:30", bis: "09:50", pause: true },
  { name: "3. Stunde", von: "09:50", bis: "10:35" },
  { name: "4. Stunde", von: "10:35", bis: "11:20" },
  { name: "Pause", von: "11:20", bis: "11:40", pause: true },
  { name: "5. Stunde", von: "11:40", bis: "12:25" },
  { name: "6. Stunde", von: "12:25", bis: "13:10" },
  { name: "Mittagspause", von: "13:10", bis: "14:00", pause: true },
  { name: "7. Stunde", von: "14:00", bis: "14:45" },
  { name: "8. Stunde", von: "14:45", bis: "15:30" },
  { name: "9. Stunde", von: "15:30", bis: "16:15" },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export default function StundenuhrPage() {
  const [blocks, setBlocks] = useStored<Block[]>("stundenuhr.raster", STANDARD);
  const [bearbeiten, setBearbeiten] = useState(false);

  const now = useNow(1000);
  useWakeLock(true);

  const bereit = now > 0;
  const jetzt = new Date(bereit ? now : Date.UTC(2000, 0, 1));
  const minutenJetzt = jetzt.getHours() * 60 + jetzt.getMinutes();
  const sekundenJetzt = minutenJetzt * 60 + jetzt.getSeconds();

  const { aktuell, naechster } = useMemo(() => {
    const sortiert = [...blocks].sort(
      (a, b) => toMinutes(a.von) - toMinutes(b.von),
    );
    const idx = sortiert.findIndex(
      (b) =>
        minutenJetzt >= toMinutes(b.von) && minutenJetzt < toMinutes(b.bis),
    );
    return {
      aktuell: idx >= 0 ? sortiert[idx] : undefined,
      naechster:
        idx >= 0
          ? sortiert[idx + 1]
          : sortiert.find((b) => toMinutes(b.von) > minutenJetzt),
    };
  }, [blocks, minutenJetzt]);

  const restSekunden = aktuell
    ? toMinutes(aktuell.bis) * 60 - sekundenJetzt
    : naechster
      ? toMinutes(naechster.von) * 60 - sekundenJetzt
      : 0;

  const fortschritt = aktuell
    ? (sekundenJetzt - toMinutes(aktuell.von) * 60) /
      Math.max(1, (toMinutes(aktuell.bis) - toMinutes(aktuell.von)) * 60)
    : 0;

  const knapp = Boolean(aktuell) && !aktuell?.pause && restSekunden <= 300;
  const farbe = aktuell?.pause
    ? "var(--a-teal)"
    : knapp
      ? "var(--lmg-orange)"
      : "var(--lmg-blue)";

  const uhrzeit = bereit
    ? jetzt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <ToolShell slug="stundenuhr" bleed>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <p className="tnum font-display text-2xl font-bold text-muted sm:text-3xl">
          {uhrzeit}
        </p>

        {bereit && aktuell ? (
          <>
            <h2
              className="font-display leading-none font-extrabold"
              style={{
                color: farbe,
                fontSize: "clamp(2rem, 6vw, 4.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              {aktuell.name}
            </h2>
            <p
              className="tnum font-display leading-none font-extrabold"
              style={{
                fontSize: "clamp(4rem, 17vw, 15rem)",
                letterSpacing: "-0.045em",
                color: farbe,
              }}
            >
              {formatClock(restSekunden)}
            </p>
            <p className="text-xl text-muted sm:text-2xl">
              {aktuell.pause ? "bis es weitergeht" : "noch übrig"}
            </p>
            <div className="h-3 w-[min(80vw,48rem)] overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${Math.min(100, Math.max(0, fortschritt * 100))}%`,
                  background: farbe,
                }}
              />
            </div>
          </>
        ) : !bereit ? null : (
          <>
            <h2 className="font-display text-4xl font-extrabold sm:text-6xl">
              Gerade kein Unterricht
            </h2>
            {naechster ? (
              <p className="text-xl text-muted sm:text-2xl">
                {naechster.name} beginnt um {naechster.von} — in{" "}
                <span className="tnum font-semibold text-ink">
                  {formatClock(restSekunden)}
                </span>
              </p>
            ) : (
              <p className="text-xl text-muted">Für heute war es das.</p>
            )}
          </>
        )}

        {aktuell && naechster ? (
          <p className="text-lg text-muted">
            Danach: {naechster.name} ab {naechster.von}
          </p>
        ) : null}
      </div>

      <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-center gap-3 px-5 py-4">
          <Button
            variant="ghost"
            icon="pen"
            onClick={() => setBearbeiten((b) => !b)}
          >
            Stundenraster anpassen
          </Button>
          {bearbeiten ? (
            <Button
              variant="outline"
              icon="reset"
              onClick={() => setBlocks(STANDARD)}
            >
              Standard wiederherstellen
            </Button>
          ) : null}
        </div>

        {bearbeiten ? (
          <div className="mx-auto w-full max-w-[1500px] px-5 pb-5">
            <Panel className="p-5">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {blocks.map((block, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2"
                  >
                    <input
                      value={block.name}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b, j) =>
                            j === i ? { ...b, name: e.target.value } : b,
                          ),
                        )
                      }
                      className="h-9 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[0.9rem] font-medium outline-none"
                      aria-label="Bezeichnung"
                    />
                    <input
                      type="time"
                      value={block.von}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b, j) =>
                            j === i ? { ...b, von: e.target.value } : b,
                          ),
                        )
                      }
                      className="tnum h-9 rounded-lg bg-surface px-2 text-[0.85rem] outline-none"
                      aria-label="Beginn"
                    />
                    <input
                      type="time"
                      value={block.bis}
                      onChange={(e) =>
                        setBlocks((prev) =>
                          prev.map((b, j) =>
                            j === i ? { ...b, bis: e.target.value } : b,
                          ),
                        )
                      }
                      className="tnum h-9 rounded-lg bg-surface px-2 text-[0.85rem] outline-none"
                      aria-label="Ende"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBlocks((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"
                      aria-label={`${block.name} entfernen`}
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="soft"
                size="sm"
                icon="plus"
                className="mt-3"
                onClick={() =>
                  setBlocks((prev) => [
                    ...prev,
                    { name: "Neue Stunde", von: "16:15", bis: "17:00" },
                  ])
                }
              >
                Zeile hinzufügen
              </Button>
            </Panel>
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
