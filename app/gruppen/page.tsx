"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { ClassPicker, useRoster } from "@/components/ClassPicker";
import { Icon } from "@/components/Icons";
import { Button, EmptyState, Panel, Segmented, Stepper } from "@/components/ui";
import { useStored } from "@/lib/storage";
import {
  ROLES,
  buildGroups,
  groupLabel,
  pairKey,
  recordHistory,
  type PairCounts,
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
          className={`h-11 rounded-xl border px-4 text-[0.9rem] font-medium transition ${
            withRoles
              ? "border-transparent text-white"
              : "border-line text-muted hover:text-ink"
          }`}
          style={withRoles ? { background: "var(--a-orange)" } : undefined}
        >
          Rollen verteilen
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
          <Panel
            title="Wer ist heute da?"
            action={
              absent.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAbsent([])}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  Alle zurücksetzen
                </button>
              ) : (
                <span className="text-sm text-muted">
                  Namen antippen = fehlt
                </span>
              )
            }
          >
            <div className="flex flex-wrap gap-2 p-5">
              {names.map((name) => {
                const isAbsent = absent.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAbsent(name)}
                    className={`h-9 rounded-lg border px-3 text-[0.9rem] font-medium transition ${
                      isAbsent
                        ? "border-line bg-surface-2 text-muted line-through opacity-60"
                        : "border-transparent"
                    }`}
                    style={
                      isAbsent
                        ? undefined
                        : {
                            background:
                              "color-mix(in srgb, var(--lmg-blue) 12%, transparent)",
                            color: "var(--lmg-blue)",
                          }
                    }
                  >
                    {name}
                  </button>
                );
              })}
              {names.length === 0 ? (
                <p className="py-4 text-muted">
                  Diese Klasse hat noch keine Namen.
                </p>
              ) : null}
            </div>
          </Panel>

          <BlockedPairsPanel
            names={names}
            blockedPairs={blockedPairs}
            onChange={setBlockedPairs}
            historySize={Object.keys(history).length}
            onClearHistory={() => setHistory({})}
          />
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
                    {withRoles && j < ROLES.length ? (
                      <span className="shrink-0 text-[0.78rem] font-medium text-muted">
                        {ROLES[j]}
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
