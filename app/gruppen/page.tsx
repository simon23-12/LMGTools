"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Anwesenheit } from "@/components/Anwesenheit";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Icon } from "@/components/Icons";
import { Button, EmptyState, Panel, Segmented, Stepper } from "@/components/ui";
import { useStored } from "@/lib/storage";
import { newId } from "@/lib/classes";
import {
  STANDARD_ROLLEN,
  buildGroups,
  groupLabel,
  pairKey,
  recordHistory,
  type PairCounts,
  type Rolle,
} from "@/lib/grouping";

type Basis = "anzahl" | "groesse";

const PALETTE = [
  "var(--a-blue)",
  "var(--a-orange)",
  "var(--a-teal)",
  "var(--a-violet)",
  "var(--a-green)",
  "var(--a-red)",
  "var(--a-slate)",
];

export default function GruppenPage() {
  const { classes, hydrated, klasse, names, selectedId, setSelectedId } =
    useRoster("gruppen");

  const [basis, setBasis] = useState<Basis>("groesse");
  const [groupSize, setGroupSize] = useState(4);
  const [groupCount, setGroupCount] = useState(5);
  const [withRoles, setWithRoles] = useState(false);
  /* Rollen gelten klassenuebergreifend — sie haengen an der Methode,
     nicht an der Lerngruppe. */
  const [rollen, setRollen] = useStored<Rolle[]>(
    "gruppen.rollen",
    STANDARD_ROLLEN,
  );
  const [absent, setAbsent] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [groups, setGroups] = useState<string[][]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  const classKey = klasse?.id ?? "none";
  const [history, setHistory] = useStored<PairCounts>(
    `gruppen.history.${classKey}`,
    {},
  );
  const [blockedPairs, setBlockedPairs] = useStored<string[]>(
    `gruppen.blocked.${classKey}`,
    [],
  );

  /* Klassenwechsel: Abwesende und Ergebnis gehoeren zur alten Klasse.
     Anpassung waehrend des Renderns statt im Effect — React verwirft
     das angefangene Ergebnis und rendert direkt mit den neuen Werten. */
  const [letzteKlasse, setLetzteKlasse] = useState(classKey);
  if (letzteKlasse !== classKey) {
    setLetzteKlasse(classKey);
    setAbsent([]);
    setGroups([]);
    setViolations([]);
  }

  const present = useMemo(
    () => names.filter((n) => !absent.includes(n)),
    [names, absent],
  );

  /* Die Reihenfolge der Liste bestimmt, wer welche Rolle bekommt. */
  const aktiveRollen = useMemo(
    () => rollen.filter((r) => r.aktiv),
    [rollen],
  );

  const generate = useCallback(() => {
    if (present.length === 0) return;
    const result = buildGroups({
      names: present,
      groupCount: basis === "anzahl" ? groupCount : undefined,
      groupSize: basis === "groesse" ? groupSize : undefined,
      blockedPairs,
      history,
    });
    setGroups(result.groups);
    setViolations(result.violations);
    setHistory(recordHistory(result.groups, history));
    setShowSetup(false);
  }, [
    present,
    basis,
    groupCount,
    groupSize,
    blockedPairs,
    history,
    setHistory,
  ]);

  function toggleAbsent(name: string) {
    setAbsent((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

  const expectedGroups =
    basis === "anzahl"
      ? Math.min(groupCount, Math.max(1, present.length))
      : Math.ceil(present.length / Math.max(1, groupSize));

  if (hydrated && classes.length === 0) {
    return (
      <ToolShell slug="gruppen">
        <Panel className="mx-auto max-w-xl">
          <EmptyState icon="groups" title="Dafür braucht es eine Klassenliste">
            Lege unter <strong className="text-ink">Klassen</strong> eine Liste
            mit Vornamen an — danach teilst du hier in zwei Klicks ein.
          </EmptyState>
          <div className="flex justify-center pb-8">
            <Link
              href="/klassen"
              className="inline-flex h-11 items-center rounded-xl px-4 font-medium text-white transition hover:brightness-110"
              style={{ background: "var(--a-orange)" }}
            >
              Zu den Klassen
            </Link>
          </div>
        </Panel>
      </ToolShell>
    );
  }

  return (
    <ToolShell slug="gruppen">
      {/* ---------- Steuerleiste ---------- */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ClassPicker
          classes={classes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <Segmented<Basis>
          value={basis}
          onChange={setBasis}
          options={[
            { value: "groesse", label: "Gruppengröße" },
            { value: "anzahl", label: "Anzahl Gruppen" },
          ]}
        />

        {basis === "groesse" ? (
          <Stepper
            value={groupSize}
            onChange={setGroupSize}
            min={2}
            max={12}
            suffix="pro Gruppe"
          />
        ) : (
          <Stepper
            value={groupCount}
            onChange={setGroupCount}
            min={2}
            max={16}
            suffix="Gruppen"
          />
        )}

        <Button
          variant="primary"
          icon="shuffle"
          onClick={generate}
          disabled={present.length === 0}
        >
          {groups.length > 0 ? "Neu einteilen" : "Einteilen"}
        </Button>

        <button
          type="button"
          onClick={() => setWithRoles((r) => !r)}
          disabled={aktiveRollen.length === 0}
          title={
            aktiveRollen.length === 0
              ? "Erst unten mindestens eine Rolle auswählen"
              : undefined
          }
          className={`h-11 rounded-xl border px-4 text-[0.9rem] font-medium transition disabled:opacity-40 ${
            withRoles && aktiveRollen.length > 0
              ? "border-transparent text-white"
              : "border-line text-muted hover:text-ink"
          }`}
          style={
            withRoles && aktiveRollen.length > 0
              ? { background: "var(--a-orange)" }
              : undefined
          }
        >
          Rollen verteilen
          {aktiveRollen.length > 0 ? (
            <span className="ml-1.5 opacity-70">({aktiveRollen.length})</span>
          ) : null}
        </button>

        <Button
          variant="ghost"
          icon="people"
          onClick={() => setShowSetup((s) => !s)}
        >
          {present.length} von {names.length} da
        </Button>
      </div>

      {/* ---------- Anwesenheit und Regeln ---------- */}
      {showSetup ? (
        <div className="mb-7 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Anwesenheit
            names={names}
            absent={absent}
            onToggle={toggleAbsent}
            onReset={() => setAbsent([])}
          />

          <div className="space-y-4">
            <RollenPanel
              rollen={rollen}
              onChange={setRollen}
              onAktivieren={() => setWithRoles(true)}
            />
            <BlockedPairsPanel
              names={names}
              blockedPairs={blockedPairs}
              onChange={setBlockedPairs}
              historySize={Object.keys(history).length}
              onClearHistory={() => setHistory({})}
            />
          </div>
        </div>
      ) : null}

      {/* ---------- Ergebnis ---------- */}
      {violations.length > 0 ? (
        <p
          className="mb-4 rounded-xl px-4 py-3 text-[0.9rem]"
          style={{
            background: "color-mix(in srgb, var(--alert) 12%, transparent)",
            color: "var(--alert)",
          }}
        >
          Bei dieser Gruppengröße ließen sich {violations.length} deiner Regeln
          nicht einhalten: {violations.map((v) => v.replace("|", " + ")).join(", ")}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <Panel>
          <EmptyState icon="groups" title="Noch nichts eingeteilt">
            {present.length > 0 ? (
              <>
                {present.length} Schülerinnen und Schüler ergeben{" "}
                <strong className="text-ink">{expectedGroups} Gruppen</strong>.
                Ein Klick auf „Einteilen“ genügt.
              </>
            ) : (
              "Trag zuerst Namen in die Klassenliste ein."
            )}
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group, i) => (
            <article
              key={i}
              className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]"
              style={{ ["--accent" as string]: PALETTE[i % PALETTE.length] }}
            >
              <header
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent) 14%, transparent)",
                  color: "var(--accent)",
                }}
              >
                <h3 className="font-display text-[1.05rem] font-bold">
                  {groupLabel(i)}
                </h3>
                <span className="text-sm font-semibold opacity-80">
                  {group.length}
                </span>
              </header>
              <ul className="divide-y divide-[var(--line)]">
                {group.map((name, j) => (
                  <li
                    key={name}
                    className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="font-display text-[1.1rem] font-semibold">
                      {name}
                    </span>
                    {withRoles && j < aktiveRollen.length ? (
                      <span className="shrink-0 text-[0.78rem] font-medium text-muted">
                        {aktiveRollen[j].name}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {groups.length > 0 ? (
        <div className="mt-7 flex flex-wrap gap-2.5 border-t border-line pt-6">
          <Button variant="outline" icon="reset" onClick={generate}>
            Nochmal würfeln
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Drucken
          </Button>
          <Button variant="ghost" onClick={() => setShowSetup((s) => !s)}>
            {showSetup ? "Einstellungen ausblenden" : "Einstellungen zeigen"}
          </Button>
        </div>
      ) : null}
    </ToolShell>
  );
}

/** Regeln der Art „diese zwei nicht zusammen“. */
function BlockedPairsPanel({
  names,
  blockedPairs,
  onChange,
  historySize,
  onClearHistory,
}: {
  names: string[];
  blockedPairs: string[];
  onChange: (next: string[]) => void;
  historySize: number;
  onClearHistory: () => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  function add() {
    if (!a || !b || a === b) return;
    const key = pairKey(a, b);
    if (blockedPairs.includes(key)) return;
    onChange([...blockedPairs, key]);
    setA("");
    setB("");
  }

  return (
    <Panel title="Nicht zusammen">
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <select
            value={a}
            onChange={(e) => setA(e.target.value)}
            aria-label="Erster Name"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-[0.9rem] outline-none"
          >
            <option value="">Name …</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-muted">+</span>
          <select
            value={b}
            onChange={(e) => setB(e.target.value)}
            aria-label="Zweiter Name"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-[0.9rem] outline-none"
          >
            <option value="">Name …</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="soft"
            icon="plus"
            onClick={add}
            disabled={!a || !b || a === b}
            className="shrink-0"
          >
            <span className="sr-only">Regel hinzufügen</span>
          </Button>
        </div>

        {blockedPairs.length === 0 ? (
          <p className="text-[0.9rem] leading-relaxed text-muted">
            Hier legst du Paare fest, die nicht in dieselbe Gruppe sollen. Die
            Einteilung hält sich daran, solange es rechnerisch möglich ist.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {blockedPairs.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onChange(blockedPairs.filter((k) => k !== key))}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.85rem] font-medium transition hover:brightness-105"
                  style={{
                    background:
                      "color-mix(in srgb, var(--alert) 12%, transparent)",
                    color: "var(--alert)",
                  }}
                  title="Regel entfernen"
                >
                  {key.replace("|", " + ")}
                  <Icon name="x" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-line pt-4 text-[0.85rem] text-muted">
          <p className="mb-2 leading-relaxed">
            Die Einteilung merkt sich, wer schon zusammengearbeitet hat, und
            bevorzugt neue Konstellationen.{" "}
            {historySize > 0 ? `${historySize} Paarungen bekannt.` : ""}
          </p>
          {historySize > 0 ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="font-medium underline underline-offset-2 hover:text-ink"
            >
              Gedächtnis leeren
            </button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Eigene Rollen anlegen und auswaehlen. Die Reihenfolge entscheidet,
 * wer in der Gruppe welche Rolle bekommt: die erste aktive Rolle geht
 * an das erste Mitglied und so weiter.
 */
function RollenPanel({
  rollen,
  onChange,
  onAktivieren,
}: {
  rollen: Rolle[];
  onChange: (next: Rolle[]) => void;
  onAktivieren: () => void;
}) {
  const [entwurf, setEntwurf] = useState("");
  const aktive = rollen.filter((r) => r.aktiv).length;

  function hinzufuegen(e: React.FormEvent) {
    e.preventDefault();
    const name = entwurf.trim();
    if (!name) return;
    onChange([...rollen, { id: newId(), name, aktiv: true }]);
    setEntwurf("");
    onAktivieren();
  }

  function umschalten(id: string) {
    const next = rollen.map((r) =>
      r.id === id ? { ...r, aktiv: !r.aktiv } : r,
    );
    onChange(next);
    if (next.some((r) => r.aktiv)) onAktivieren();
  }

  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= rollen.length) return;
    const next = [...rollen];
    [next[index], next[ziel]] = [next[ziel], next[index]];
    onChange(next);
  }

  return (
    <Panel
      title="Rollen"
      action={
        <button
          type="button"
          onClick={() => onChange(STANDARD_ROLLEN)}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Vorschlag
        </button>
      }
    >
      <div className="space-y-4 p-5">
        <ul className="space-y-1.5">
          {rollen.map((rolle, i) => (
            <li key={rolle.id} className="flex items-center gap-1.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={rolle.aktiv}
                  onChange={() => umschalten(rolle.id)}
                  className="size-4 shrink-0 accent-[var(--a-orange)]"
                  aria-label={`${rolle.name} verteilen`}
                />
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-md text-[0.7rem] font-bold"
                  style={
                    rolle.aktiv
                      ? {
                          background:
                            "color-mix(in srgb, var(--a-orange) 16%, transparent)",
                          color: "var(--a-orange)",
                        }
                      : { background: "var(--surface-2)", color: "var(--ink-muted)" }
                  }
                  title={
                    rolle.aktiv
                      ? `Geht an Mitglied ${rollen.filter((r, j) => r.aktiv && j < i).length + 1} der Gruppe`
                      : "Nicht aktiv"
                  }
                >
                  {rolle.aktiv
                    ? rollen.filter((r, j) => r.aktiv && j < i).length + 1
                    : "–"}
                </span>
                <input
                  value={rolle.name}
                  onChange={(e) =>
                    onChange(
                      rollen.map((r) =>
                        r.id === rolle.id ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                  className={`h-9 min-w-0 flex-1 rounded-lg bg-transparent px-1.5 text-[0.9rem] outline-none focus:bg-surface-2 ${
                    rolle.aktiv ? "font-medium text-ink" : "text-muted"
                  }`}
                  aria-label={`Bezeichnung der Rolle ${rolle.name}`}
                />
              </label>
              <button
                type="button"
                onClick={() => verschieben(i, -1)}
                disabled={i === 0}
                className="grid size-7 shrink-0 place-items-center rounded text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-25"
                aria-label={`${rolle.name} nach oben`}
                title="Nach oben"
              >
                <Icon name="back" size={13} className="rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => verschieben(i, 1)}
                disabled={i === rollen.length - 1}
                className="grid size-7 shrink-0 place-items-center rounded text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-25"
                aria-label={`${rolle.name} nach unten`}
                title="Nach unten"
              >
                <Icon name="back" size={13} className="-rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => onChange(rollen.filter((r) => r.id !== rolle.id))}
                className="grid size-7 shrink-0 place-items-center rounded text-muted transition hover:bg-surface-2 hover:text-ink"
                aria-label={`${rolle.name} löschen`}
                title="Rolle löschen"
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={hinzufuegen} className="flex gap-2">
          <input
            value={entwurf}
            onChange={(e) => setEntwurf(e.target.value)}
            placeholder="Eigene Rolle, z. B. Advocatus Diaboli"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-[0.9rem] outline-none"
            aria-label="Neue Rolle"
          />
          <Button
            type="submit"
            size="sm"
            variant="soft"
            icon="plus"
            disabled={!entwurf.trim()}
            className="shrink-0"
          >
            <span className="sr-only">Rolle hinzufügen</span>
          </Button>
        </form>

        <p className="border-t border-line pt-3 text-[0.85rem] leading-relaxed text-muted">
          {aktive === 0
            ? "Keine Rolle ausgewählt — es werden nur Namen verteilt."
            : `Die ${aktive} angehakten Rollen gehen der Reihe nach an die Gruppenmitglieder. Bleiben Mitglieder übrig, gehen sie leer aus.`}
        </p>
      </div>
    </Panel>
  );
}
