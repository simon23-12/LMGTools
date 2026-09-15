"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Button, Field, Panel, Segmented, TextInput } from "@/components/ui";
import { useStored } from "@/lib/storage";

type Stufe = "oberstufe" | "sek1";

/** Notenpunkte der Oberstufe mit den in NRW üblichen Prozentgrenzen. */
const OBERSTUFE_STANDARD = [
  { punkte: 15, note: "1+", ab: 95 },
  { punkte: 14, note: "1", ab: 90 },
  { punkte: 13, note: "1−", ab: 85 },
  { punkte: 12, note: "2+", ab: 80 },
  { punkte: 11, note: "2", ab: 75 },
  { punkte: 10, note: "2−", ab: 70 },
  { punkte: 9, note: "3+", ab: 65 },
  { punkte: 8, note: "3", ab: 60 },
  { punkte: 7, note: "3−", ab: 55 },
  { punkte: 6, note: "4+", ab: 50 },
  { punkte: 5, note: "4", ab: 45 },
  { punkte: 4, note: "4−", ab: 39 },
  { punkte: 3, note: "5+", ab: 33 },
  { punkte: 2, note: "5", ab: 27 },
  { punkte: 1, note: "5−", ab: 20 },
  { punkte: 0, note: "6", ab: 0 },
];

const SEK1_STANDARD = [
  { punkte: 1, note: "1", ab: 87 },
  { punkte: 2, note: "2", ab: 73 },
  { punkte: 3, note: "3", ab: 59 },
  { punkte: 4, note: "4", ab: 45 },
  { punkte: 5, note: "5", ab: 20 },
  { punkte: 6, note: "6", ab: 0 },
];

type Stufeneintrag = { punkte: number; note: string; ab: number };

export default function NotenPage() {
  const [stufe, setStufe] = useState<Stufe>("oberstufe");
  const [maxPunkte, setMaxPunkte] = useStored("noten.max", 60);
  const [erreicht, setErreicht] = useState("");
  const [schluesselOber, setSchluesselOber] = useStored<Stufeneintrag[]>(
    "noten.schluessel.oberstufe",
    OBERSTUFE_STANDARD,
  );
  const [schluesselSek1, setSchluesselSek1] = useStored<Stufeneintrag[]>(
    "noten.schluessel.sek1",
    SEK1_STANDARD,
  );
  const [anpassen, setAnpassen] = useState(false);

  const schluessel = stufe === "oberstufe" ? schluesselOber : schluesselSek1;
  const setSchluessel =
    stufe === "oberstufe" ? setSchluesselOber : setSchluesselSek1;

  /** Von der höchsten Grenze abwärts die erste passende nehmen. */
  function bewerte(prozent: number): Stufeneintrag {
    const sortiert = [...schluessel].sort((a, b) => b.ab - a.ab);
    return sortiert.find((s) => prozent >= s.ab) ?? sortiert[sortiert.length - 1];
  }

  const erreichtZahl = Number(erreicht.replace(",", "."));
  const gueltig =
    erreicht.trim() !== "" &&
    Number.isFinite(erreichtZahl) &&
    erreichtZahl >= 0 &&
    maxPunkte > 0;
  const prozent = gueltig ? (erreichtZahl / maxPunkte) * 100 : 0;
  const ergebnis = gueltig ? bewerte(prozent) : undefined;

  /** Der eigentliche Klausurschlüssel: Prozentgrenzen in echte Punkte. */
  const tabelle = useMemo(() => {
    const sortiert = [...schluessel].sort((a, b) => b.ab - a.ab);
    return sortiert.map((eintrag, i) => {
      const vonPunkte = Math.ceil((eintrag.ab / 100) * maxPunkte * 100) / 100;
      const obereGrenze =
        i === 0
          ? maxPunkte
          : Math.ceil((sortiert[i - 1].ab / 100) * maxPunkte * 100) / 100 - 0.5;
      return { ...eintrag, vonPunkte, bisPunkte: Math.max(vonPunkte, obereGrenze) };
    });
  }, [schluessel, maxPunkte]);

  return (
    <ToolShell slug="noten">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Segmented<Stufe>
            value={stufe}
            onChange={setStufe}
            options={[
              { value: "oberstufe", label: "Oberstufe (15 Punkte)" },
              { value: "sek1", label: "Sek I (Noten 1–6)" },
            ]}
          />
          <Button variant="ghost" icon="pen" onClick={() => setAnpassen((a) => !a)}>
            Grenzen anpassen
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Drucken
          </Button>
        </div>

        {/* ---------- Schnellrechner ---------- */}
        <Panel className="mb-6 p-5 sm:p-7">
          <div className="grid items-end gap-5 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Erreichte Punkte">
              <TextInput
                inputMode="decimal"
                value={erreicht}
                onChange={(e) => setErreicht(e.target.value)}
                placeholder="z. B. 43,5"
                className="tnum text-lg"
              />
            </Field>
            <Field label="Maximal erreichbar">
              <TextInput
                inputMode="decimal"
                value={String(maxPunkte)}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(v) && v > 0) setMaxPunkte(v);
                }}
                className="tnum text-lg"
              />
            </Field>

            <div className="sm:pb-1">
              {ergebnis ? (
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className="block text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                      {stufe === "oberstufe" ? "Punkte" : "Note"}
                    </span>
                    <span
                      className="tnum font-display text-6xl leading-none font-extrabold"
                      style={{ color: "var(--lmg-blue)" }}
                    >
                      {stufe === "oberstufe" ? ergebnis.punkte : ergebnis.note}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                      {stufe === "oberstufe" ? "Note" : "Prozent"}
                    </span>
                    <span className="tnum font-display text-3xl leading-none font-bold text-muted">
                      {stufe === "oberstufe"
                        ? ergebnis.note
                        : `${prozent.toFixed(1)} %`}
                    </span>
                  </div>
                  {stufe === "oberstufe" ? (
                    <span className="tnum text-lg text-muted">
                      {prozent.toFixed(1)} %
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted">Punkte eintragen für das Ergebnis.</p>
              )}
            </div>
          </div>
        </Panel>

        {/* ---------- Schlüssel ---------- */}
        <Panel
          title={`Punkteschlüssel für ${maxPunkte} Punkte`}
          action={
            anpassen ? (
              <button
                type="button"
                onClick={() =>
                  setSchluessel(
                    stufe === "oberstufe" ? OBERSTUFE_STANDARD : SEK1_STANDARD,
                  )
                }
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Standard wiederherstellen
              </button>
            ) : null
          }
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-[0.75rem] font-bold tracking-wide text-muted uppercase">
                {stufe === "oberstufe" ? (
                  <th className="px-5 py-2.5">Punkte</th>
                ) : null}
                <th className="px-5 py-2.5">Note</th>
                <th className="px-5 py-2.5">ab Prozent</th>
                <th className="px-5 py-2.5">Punkte von</th>
                <th className="px-5 py-2.5">bis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {tabelle.map((zeile, i) => {
                const getroffen =
                  ergebnis &&
                  ergebnis.punkte === zeile.punkte &&
                  ergebnis.note === zeile.note;
                return (
                  <tr
                    key={`${zeile.punkte}-${zeile.note}`}
                    style={
                      getroffen
                        ? {
                            background:
                              "color-mix(in srgb, var(--lmg-blue) 10%, transparent)",
                          }
                        : undefined
                    }
                  >
                    {stufe === "oberstufe" ? (
                      <td className="tnum px-5 py-2.5 font-display text-lg font-bold">
                        {zeile.punkte}
                      </td>
                    ) : null}
                    <td className="px-5 py-2.5 font-display text-lg font-semibold">
                      {zeile.note}
                    </td>
                    <td className="tnum px-5 py-2.5">
                      {anpassen ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={zeile.ab}
                          onChange={(e) => {
                            const wert = Number(e.target.value);
                            setSchluessel(
                              schluessel.map((s) =>
                                s.punkte === zeile.punkte && s.note === zeile.note
                                  ? { ...s, ab: wert }
                                  : s,
                              ),
                            );
                          }}
                          className="tnum h-9 w-20 rounded-lg border border-line bg-surface-2 px-2 outline-none"
                          aria-label={`Prozentgrenze für ${zeile.note}`}
                        />
                      ) : (
                        `${zeile.ab} %`
                      )}
                    </td>
                    <td className="tnum px-5 py-2.5 font-semibold">
                      {formatPunkte(zeile.vonPunkte)}
                    </td>
                    <td className="tnum px-5 py-2.5 text-muted">
                      {i === 0 ? formatPunkte(maxPunkte) : formatPunkte(zeile.bisPunkte)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <p className="mt-6 text-[0.9rem] leading-relaxed text-muted">
          Die voreingestellten Grenzen entsprechen dem in NRW gebräuchlichen
          Schlüssel. Sie sind kein Erlass — prüf sie gegen die Absprachen deiner
          Fachkonferenz und pass sie oben an, wenn nötig. Die Änderungen bleiben
          auf diesem Gerät gespeichert.
        </p>
      </div>
    </ToolShell>
  );
}

function formatPunkte(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}
