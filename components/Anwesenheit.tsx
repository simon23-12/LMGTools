"use client";

import { Panel } from "./ui";

/**
 * Wer ist heute da? Namen antippen blendet sie aus der Einteilung aus.
 * Wird von Gruppen und Mingle gemeinsam benutzt — die Farbe kommt aus
 * --accent des umgebenden Tools.
 */
export function Anwesenheit({
  names,
  absent,
  onToggle,
  onReset,
}: {
  names: string[];
  absent: string[];
  onToggle: (name: string) => void;
  onReset: () => void;
}) {
  return (
    <Panel
      title="Wer ist heute da?"
      action={
        absent.length > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Alle zurücksetzen
          </button>
        ) : (
          <span className="text-sm text-muted">Namen antippen = fehlt</span>
        )
      }
    >
      <div className="flex flex-wrap gap-2 p-5">
        {names.map((name) => {
          const fehlt = absent.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              aria-pressed={!fehlt}
              className={`h-9 rounded-lg border px-3 text-[0.9rem] font-medium transition ${
                fehlt
                  ? "border-line bg-surface-2 text-muted line-through opacity-60"
                  : "border-transparent"
              }`}
              style={
                fehlt
                  ? undefined
                  : {
                      background:
                        "color-mix(in srgb, var(--accent, var(--lmg-blue)) 12%, transparent)",
                      color: "var(--accent, var(--lmg-blue))",
                    }
              }
            >
              {name}
            </button>
          );
        })}
        {names.length === 0 ? (
          <p className="py-4 text-muted">Diese Klasse hat noch keine Namen.</p>
        ) : null}
      </div>
    </Panel>
  );
}
