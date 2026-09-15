"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useClasses } from "@/lib/classes";
import { useStored } from "@/lib/storage";
import { Icon } from "./Icons";

/**
 * Gemeinsame Klassenauswahl fuer Gruppen, Losen, Sitzplan und Dienste.
 * Merkt sich die zuletzt gewaehlte Klasse pro Tool.
 */
export function useRoster(toolKey: string) {
  const { classes, hydrated } = useClasses();
  const [selectedId, setSelectedId] = useStored<string>(
    `roster.${toolKey}`,
    "",
  );

  const klasse = useMemo(() => {
    if (classes.length === 0) return undefined;
    return classes.find((k) => k.id === selectedId) ?? classes[0];
  }, [classes, selectedId]);

  return {
    classes,
    hydrated,
    klasse,
    names: klasse?.students ?? [],
    selectedId: klasse?.id ?? "",
    setSelectedId,
  };
}

export function ClassPicker({
  classes,
  selectedId,
  onSelect,
  className = "",
}: {
  classes: { id: string; name: string; students: string[] }[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  if (classes.length === 0) {
    return (
      <Link
        href="/klassen"
        className={`inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-[0.95rem] font-medium text-muted transition hover:text-ink ${className}`}
      >
        <Icon name="plus" size={17} />
        Erst eine Klasse anlegen
      </Link>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Klasse wählen"
          className="h-11 appearance-none rounded-xl border border-line bg-surface-2 py-0 pr-10 pl-4 text-[0.95rem] font-semibold text-ink outline-none"
        >
          {classes.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} ({k.students.length})
            </option>
          ))}
        </select>
        <Icon
          name="back"
          size={16}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 -rotate-90 text-muted"
        />
      </div>
      <Link
        href="/klassen"
        className="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
        title="Klassenlisten bearbeiten"
        aria-label="Klassenlisten bearbeiten"
      >
        <Icon name="people" size={19} />
      </Link>
    </div>
  );
}
