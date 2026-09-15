import { shuffle } from "./classes";

export type PairCounts = Record<string, number>;

/** Reihenfolge-unabhaengiger Schluessel fuer ein Namenspaar. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Verteilt reihum, damit die Gruppen moeglichst gleich gross werden. */
function partition(names: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  names.forEach((name, i) => groups[i % groupCount].push(name));
  return groups;
}

/**
 * Je kleiner, desto besser. Verbotene Paare wiegen sehr schwer,
 * schon dagewesene Paarungen nur leicht — so bleibt die Einteilung
 * abwechslungsreich, ohne dass eine Regel gebrochen wird.
 */
function score(
  groups: string[][],
  blocked: Set<string>,
  history: PairCounts,
): number {
  let total = 0;
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = pairKey(group[i], group[j]);
        if (blocked.has(key)) total += 1000;
        total += history[key] ?? 0;
      }
    }
  }
  return total;
}

export type BuildOptions = {
  names: string[];
  /** Anzahl Gruppen — hat Vorrang, wenn gesetzt. */
  groupCount?: number;
  /** Alternativ: gewuenschte Gruppengroesse. */
  groupSize?: number;
  blockedPairs?: string[];
  history?: PairCounts;
  attempts?: number;
};

export type BuildResult = {
  groups: string[][];
  /** Verbotene Paare, die sich nicht vermeiden liessen. */
  violations: string[];
};

/**
 * Probiert viele zufaellige Einteilungen durch und nimmt die beste.
 * Bei Klassenstaerken bis ~35 ist das in wenigen Millisekunden erledigt
 * und deutlich einfacher als ein exakter Loeser.
 */
export function buildGroups({
  names,
  groupCount,
  groupSize,
  blockedPairs = [],
  history = {},
  attempts = 600,
}: BuildOptions): BuildResult {
  const roster = names.filter(Boolean);
  if (roster.length === 0) return { groups: [], violations: [] };

  const count = Math.max(
    1,
    Math.min(
      roster.length,
      groupCount ?? Math.ceil(roster.length / Math.max(1, groupSize ?? 4)),
    ),
  );

  const blocked = new Set(blockedPairs);
  let best = partition(shuffle(roster), count);
  let bestScore = score(best, blocked, history);

  for (let i = 1; i < attempts && bestScore > 0; i++) {
    const candidate = partition(shuffle(roster), count);
    const candidateScore = score(candidate, blocked, history);
    if (candidateScore < bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  const violations: string[] = [];
  for (const group of best) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = pairKey(group[i], group[j]);
        if (blocked.has(key)) violations.push(key);
      }
    }
  }

  return { groups: best, violations };
}

/** Zaehlt alle Paarungen einer Einteilung in die Historie ein. */
export function recordHistory(
  groups: string[][],
  history: PairCounts,
): PairCounts {
  const next: PairCounts = { ...history };
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = pairKey(group[i], group[j]);
        next[key] = (next[key] ?? 0) + 1;
      }
    }
  }
  return next;
}

export type Rolle = {
  id: string;
  name: string;
  /** Nur angehakte Rollen werden verteilt. */
  aktiv: boolean;
};

/** Vorschlag zum Loslegen — die Liste ist vollstaendig editierbar. */
export const STANDARD_ROLLEN: Rolle[] = [
  { id: "zeit", name: "Zeitwächter:in", aktiv: true },
  { id: "schrift", name: "Schriftführer:in", aktiv: true },
  { id: "praesentation", name: "Präsentator:in", aktiv: true },
  { id: "material", name: "Materialholer:in", aktiv: false },
  { id: "ruhe", name: "Ruhewächter:in", aktiv: false },
];

/** Gruppennamen, die auf dem Beamer aus acht Metern lesbar sind. */
export function groupLabel(index: number): string {
  return `Gruppe ${index + 1}`;
}
