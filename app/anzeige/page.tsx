"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, Kbd, Segmented } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";

type Ausrichtung = "mitte" | "links";

export default function AnzeigePage() {
  const [text, setText] = useStored("anzeige.text", "");
  const [entwurf, setEntwurf] = useState("");
  const [ausrichtung, setAusrichtung] = useStored<Ausrichtung>(
    "anzeige.ausrichtung",
    "mitte",
  );
  const [farbig, setFarbig] = useStored("anzeige.farbig", true);
  const [verlauf, setVerlauf] = useStored<string[]>("anzeige.verlauf", []);
  const [panelOffen, setPanelOffen] = useState(true);

  function zeigen(wert: string) {
    const t = wert.trim();
    if (!t) return;
    setText(t);
    setEntwurf("");
    setVerlauf((prev) => [t, ...prev.filter((x) => x !== t)].slice(0, 8));
  }

  useHotkeys({
    Escape: () => setPanelOffen((p) => !p),
  });

  /* Je weniger Text, desto groesser — fuellt die Wand immer aus. */
  const schriftgroesse = useMemo(() => {
    const laenge = text.trim().length;
    if (laenge === 0) return "4rem";
    if (laenge <= 3) return "clamp(6rem, 38vw, 30rem)";
    if (laenge <= 10) return "clamp(4rem, 19vw, 16rem)";
    if (laenge <= 25) return "clamp(3rem, 11vw, 9rem)";
    if (laenge <= 60) return "clamp(2.25rem, 7vw, 6rem)";
    if (laenge <= 140) return "clamp(1.75rem, 4.6vw, 3.75rem)";
    return "clamp(1.35rem, 3.2vw, 2.5rem)";
  }, [text]);

  return (
    <ToolShell
      slug="anzeige"
      bleed
      hint={
        <>
          <Kbd>Esc</Kbd> Eingabe ein/aus
        </>
      }
    >
      <div
        className={`flex flex-1 items-center px-[5vw] py-10 ${
          ausrichtung === "mitte" ? "justify-center text-center" : "justify-start text-left"
        }`}
      >
        {text ? (
          <p
            className="font-display leading-[1.06] font-extrabold text-balance"
            style={{
              fontSize: schriftgroesse,
              letterSpacing: "-0.03em",
              color: farbig ? "var(--lmg-blue)" : "var(--ink)",
              maxWidth: "100%",
              overflowWrap: "anywhere",
            }}
          >
            {text}
          </p>
        ) : (
          <p className="font-display text-3xl font-bold text-muted">
            Unten eintippen, Enter drücken.
          </p>
        )}
      </div>

      {panelOffen ? (
        <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] backdrop-blur-md">
          <div className="mx-auto w-full max-w-[1500px] px-5 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                zeigen(entwurf);
              }}
              className="flex flex-wrap gap-2.5"
            >
              <input
                value={entwurf}
                onChange={(e) => setEntwurf(e.target.value)}
                placeholder="Was soll an der Wand stehen?"
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 text-[1rem] outline-none"
                aria-label="Text für die Großanzeige"
              />
              <Button type="submit" variant="primary" icon="display">
                Zeigen
              </Button>
              <Button
                type="button"
                variant="outline"
                icon="x"
                onClick={() => setText("")}
              >
                Wand leeren
              </Button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Segmented<Ausrichtung>
                size="sm"
                value={ausrichtung}
                onChange={setAusrichtung}
                options={[
                  { value: "mitte", label: "Mittig" },
                  { value: "links", label: "Linksbündig" },
                ]}
              />
              <button
                type="button"
                onClick={() => setFarbig((f) => !f)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[0.85rem] font-medium transition ${
                  farbig ? "border-transparent text-white" : "border-line text-muted"
                }`}
                style={farbig ? { background: "var(--lmg-blue)" } : undefined}
              >
                <Icon name="eye" size={15} />
                In Schulblau
              </button>

              {verlauf.length > 0 ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  <span className="text-[0.78rem] font-semibold text-muted uppercase">
                    Zuletzt
                  </span>
                  {verlauf.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => zeigen(v)}
                      className="max-w-52 truncate rounded-lg bg-surface-2 px-2.5 py-1 text-[0.85rem] text-muted transition hover:text-ink"
                      title={v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </ToolShell>
  );
}
