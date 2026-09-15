"use client";

import { useRef, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { Button, EmptyState, Field, Panel, TextInput } from "@/components/ui";
import {
  newId,
  parseNames,
  useClasses,
  type Klasse,
} from "@/lib/classes";

export default function KlassenPage() {
  const { classes, setClasses, hydrated } = useClasses();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addClass(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const klasse: Klasse = { id: newId(), name, students: [] };
    setClasses((prev) => [...prev, klasse]);
    setNewName("");
    setOpenId(klasse.id);
  }

  function updateClass(id: string, patch: Partial<Klasse>) {
    setClasses((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    );
  }

  function removeClass(id: string) {
    const klasse = classes.find((k) => k.id === id);
    if (
      klasse &&
      !window.confirm(
        `„${klasse.name}“ mit ${klasse.students.length} Namen wirklich löschen?`,
      )
    ) {
      return;
    }
    setClasses((prev) => prev.filter((k) => k.id !== id));
  }

  /* Sicherung / Umzug auf ein anderes Gerät — reine Datei, kein Upload. */
  function exportJson() {
    const blob = new Blob([JSON.stringify(classes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lmg-klassen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("Falsches Format");
      const imported: Klasse[] = data
        .filter((k) => k && typeof k.name === "string")
        .map((k) => ({
          id: newId(),
          name: String(k.name),
          students: Array.isArray(k.students) ? k.students.map(String) : [],
        }));
      setClasses((prev) => [...prev, ...imported]);
    } catch {
      window.alert("Die Datei konnte nicht gelesen werden.");
    }
  }

  return (
    <ToolShell slug="klassen">
      <div className="mx-auto max-w-3xl">
        <p className="mb-6 rounded-2xl border border-line bg-surface px-5 py-4 text-[0.95rem] leading-relaxed text-muted">
          <strong className="font-semibold text-ink">Nur Vornamen eintragen.</strong>{" "}
          Die Listen liegen im Speicher dieses Browsers und werden nirgendwohin
          übertragen. Ein anderer Rechner oder ein gelöschter Browserverlauf
          bedeutet: Liste weg. Für den Umzug gibt es unten die Sicherung.
        </p>

        <form onSubmit={addClass} className="mb-7 flex gap-2.5">
          <TextInput
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Neue Klasse, z. B. 8b oder Q1 Philosophie"
            aria-label="Name der neuen Klasse"
          />
          <Button type="submit" variant="primary" icon="plus" className="shrink-0">
            Anlegen
          </Button>
        </form>

        {!hydrated ? null : classes.length === 0 ? (
          <Panel>
            <EmptyState icon="people" title="Noch keine Klasse angelegt">
              Leg oben deine erste Klasse an. Danach kannst du die Vornamen in
              einem Rutsch einfügen — aus Excel, Logineo oder von Hand.
            </EmptyState>
          </Panel>
        ) : (
          <div className="space-y-3">
            {classes.map((klasse) => (
              <ClassRow
                key={klasse.id}
                klasse={klasse}
                open={openId === klasse.id}
                onToggle={() =>
                  setOpenId((id) => (id === klasse.id ? null : klasse.id))
                }
                onChange={(patch) => updateClass(klasse.id, patch)}
                onRemove={() => removeClass(klasse.id)}
              />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-2.5 border-t border-line pt-6">
          <span className="mr-2 text-sm font-semibold text-muted">Sicherung</span>
          <Button
            variant="outline"
            size="sm"
            onClick={exportJson}
            disabled={classes.length === 0}
          >
            Als Datei speichern
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            Datei einlesen
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </ToolShell>
  );
}

function ClassRow({
  klasse,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  klasse: Klasse;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Klasse>) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(klasse.students.join("\n"));

  function commit() {
    onChange({ students: parseNames(draft) });
  }

  return (
    <Panel>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-[0.95rem] rounded-bl-[0.3rem] text-sm font-bold"
            style={{
              background: "color-mix(in srgb, var(--lmg-blue) 13%, transparent)",
              color: "var(--lmg-blue)",
            }}
          >
            {klasse.students.length}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display font-semibold">
              {klasse.name}
            </span>
            <span className="block truncate text-sm text-muted">
              {klasse.students.length === 0
                ? "Noch keine Namen"
                : klasse.students.slice(0, 6).join(", ") +
                  (klasse.students.length > 6 ? " …" : "")}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2"
          style={{ color: "var(--ink-muted)" }}
          aria-label={`${klasse.name} löschen`}
          title="Klasse löschen"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>

      {open ? (
        <div className="border-t border-line px-5 py-5">
          <Field
            label="Name der Klasse"
            className="mb-4 max-w-xs"
          >
            <TextInput
              value={klasse.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>
          <Field
            label="Vornamen"
            hint="Ein Name pro Zeile. Komma und Semikolon gehen auch — praktisch beim Einfügen aus einer Tabelle."
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              rows={9}
              className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-[0.9rem] leading-relaxed outline-none"
              placeholder={"Anna\nBen\nCem\nDilara"}
            />
          </Field>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" size="sm" icon="check" onClick={commit}>
              Namen übernehmen
            </Button>
            <span className="text-sm text-muted">
              {parseNames(draft).length} Namen erkannt
            </span>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
