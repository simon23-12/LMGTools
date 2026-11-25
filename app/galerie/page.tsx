"use client";

import { useCallback, useEffect, useState } from "react";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { QrCode } from "@/components/QrCode";
import {
  Button,
  Field,
  IconButton,
  Kbd,
  Panel,
  Segmented,
  Stepper,
  TextInput,
} from "@/components/ui";
import { useClasses } from "@/lib/classes";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import {
  MAX_BYTES_PRO_PLATZ,
  MAX_PLAETZE,
  abgabeLink,
  belegt,
  belegtWand,
  istBild,
  mb,
  type Platz,
  type Wand,
  type WandAenderung,
} from "@/lib/galerie";
import { antwortOderFehler, useAdresse, useWand } from "@/lib/galerie-client";

/* ---------------------------------------------------------------
   Galerie
   Eine Wand mit bis zu 32 Plaetzen. Die iPads scannen den QR-Code,
   tippen ihren Namen an und legen Bilder oder PDFs ab. Die Plaetze
   lassen sich aus einer Klassenliste fuellen oder von Hand benennen.
   Der Schluessel der Lehrkraft liegt nur in diesem Browser.
----------------------------------------------------------------- */

type MeineWand = { id: string; titel: string; schluessel: string };
type Modus = "bearbeiten" | "zeigen";

export default function GaleriePage() {
  const [waende, setWaende] = useStored<MeineWand[]>("galerie.waende", []);
  const [aktivId, setAktivId] = useStored<string>("galerie.aktiv", "");
  const [neu, setNeu] = useState(false);
  const [modus, setModus] = useState<Modus>("bearbeiten");
  const [qrGross, setQrGross] = useState(false);
  const [offen, setOffen] = useState<string | null>(null);
  const { origin, search, hash } = useAdresse();

  const meine = waende.find((w) => w.id === aktivId) ?? waende[0];
  const { wand, fehler, uebernehmen } = useWand(meine?.id ?? null, 12_000);

  // Lehrerlink von einem anderen Geraet: /galerie/?w=<id>#k=<schluessel>
  useEffect(() => {
    const w = new URLSearchParams(search).get("w");
    const k = new URLSearchParams(hash.slice(1)).get("k");
    if (w && k) {
      setWaende((prev) =>
        prev.some((x) => x.id === w) ? prev : [...prev, { id: w, titel: "Galerie", schluessel: k }],
      );
      setAktivId(w);
      window.history.replaceState(null, "", "/galerie/");
    }
  }, [search, hash, setWaende, setAktivId]);

  // Titel im eigenen Verzeichnis nachziehen, wenn er sich geaendert hat.
  useEffect(() => {
    if (wand && meine && wand.titel !== meine.titel) {
      setWaende((prev) => prev.map((x) => (x.id === wand.id ? { ...x, titel: wand.titel } : x)));
    }
  }, [wand, meine, setWaende]);

  useHotkeys({
    Escape: () => {
      setQrGross(false);
      setOffen(null);
    },
    z: () => setModus((m) => (m === "zeigen" ? "bearbeiten" : "zeigen")),
  });

  async function lehrer<T>(pfad: string, init: RequestInit): Promise<T> {
    const antwort = await fetch(pfad, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-schluessel": meine?.schluessel ?? "",
      },
    });
    return antwortOderFehler<T>(antwort);
  }

  async function speichern(aenderung: WandAenderung) {
    if (!meine) return;
    uebernehmen(
      await lehrer<Wand>(`/api/galerie/${meine.id}/`, {
        method: "PATCH",
        body: JSON.stringify(aenderung),
      }),
    );
  }

  async function dateiLoeschen(url: string) {
    if (!meine) return;
    uebernehmen(
      await lehrer<Wand>(`/api/galerie/${meine.id}/`, {
        method: "POST",
        body: JSON.stringify({ aktion: "loeschen", url }),
      }),
    );
  }

  async function wandLoeschen() {
    if (!meine || !wand) return;
    const anzahl = wand.plaetze.reduce((s, p) => s + p.dateien.length, 0);
    const ok = window.confirm(
      `„${wand.titel}“ mit ${anzahl} ${anzahl === 1 ? "Datei" : "Dateien"} endgültig löschen? Das lässt sich nicht rückgängig machen.`,
    );
    if (!ok) return;
    await lehrer(`/api/galerie/${meine.id}/`, { method: "DELETE" });
    vergessen(meine.id);
  }

  function vergessen(id: string) {
    setWaende((prev) => prev.filter((x) => x.id !== id));
    setAktivId("");
  }

  const schliessen = useCallback(() => setOffen(null), []);
  const zeigen = modus === "zeigen" && !!wand;
  const link = meine && origin ? abgabeLink(origin, meine.id) : "";
  const offenerPlatz = wand?.plaetze.find((p) => p.id === offen) ?? null;

  return (
    <ToolShell
      slug="galerie"
      bleed
      hint={
        <>
          <Kbd>Z</Kbd> Zeigen/Bearbeiten · <Kbd>Esc</Kbd> schließen
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        {!zeigen ? (
          <div className="flex flex-wrap items-center gap-3">
            {waende.length > 0 && !neu ? (
              <>
                <div className="relative">
                  <select
                    value={meine?.id ?? ""}
                    onChange={(e) => setAktivId(e.target.value)}
                    aria-label="Wand wählen"
                    className="h-11 appearance-none rounded-xl border border-line bg-surface-2 py-0 pr-10 pl-4 text-[0.95rem] font-semibold text-ink outline-none"
                  >
                    {waende.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.titel}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="back"
                    size={16}
                    className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 -rotate-90 text-muted"
                  />
                </div>
                <Segmented<Modus>
                  value={modus}
                  onChange={setModus}
                  options={[
                    { value: "bearbeiten", label: "Bearbeiten" },
                    { value: "zeigen", label: "Zeigen" },
                  ]}
                />
              </>
            ) : null}
            <div className="ml-auto flex gap-2">
              {neu ? (
                waende.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setNeu(false)}>
                    Abbrechen
                  </Button>
                ) : null
              ) : waende.length === 0 ? null : (
                <Button variant="soft" size="sm" icon="plus" onClick={() => setNeu(true)}>
                  Neue Wand
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {neu || waende.length === 0 ? (
          <NeueWand
            onAngelegt={(w, schluessel) => {
              setWaende((prev) => [...prev, { id: w.id, titel: w.titel, schluessel }]);
              setAktivId(w.id);
              uebernehmen(w);
              setNeu(false);
            }}
          />
        ) : !wand ? (
          <div className="grid flex-1 place-items-center text-center text-muted">
            {fehler ? (
              <div className="flex flex-col items-center gap-3">
                <p>{fehler}</p>
                {fehler.includes("nicht mehr") && meine ? (
                  <Button variant="outline" size="sm" onClick={() => vergessen(meine.id)}>
                    Aus der Liste nehmen
                  </Button>
                ) : null}
              </div>
            ) : (
              <p>Wand wird geladen …</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 lg:flex-row">
            <QrSpalte
              wand={wand}
              link={link}
              zeigen={zeigen}
              onGross={() => setQrGross(true)}
              onModus={() => setModus("bearbeiten")}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {!zeigen ? (
                <Werkzeugleiste
                  key={wand.id + wand.titel}
                  wand={wand}
                  meine={meine!}
                  origin={origin}
                  onSpeichern={speichern}
                  onLoeschen={wandLoeschen}
                />
              ) : null}
              {fehler ? <p className="text-sm text-muted">{fehler}</p> : null}
              <Raster
                wand={wand}
                zeigen={zeigen}
                onOeffnen={setOffen}
                onSpeichern={speichern}
              />
            </div>
          </div>
        )}
      </div>

      {qrGross && link && wand ? (
        <button
          type="button"
          onClick={() => setQrGross(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 backdrop-blur-md"
          aria-label="Schließen"
        >
          <p className="font-display text-center text-[clamp(1.5rem,4vw,3rem)] font-bold">
            {wand.titel}
          </p>
          <QrCode
            text={link}
            label={`QR-Code für ${wand.titel}`}
            className="aspect-square h-auto w-[min(80vw,70vh)] rounded-2xl"
          />
          <p className="text-lg text-muted">{link.replace(/^https?:\/\//, "")}</p>
        </button>
      ) : null}

      {offenerPlatz ? (
        <PlatzAnsicht
          platz={offenerPlatz}
          onSchliessen={schliessen}
          onLoeschen={zeigen ? undefined : dateiLoeschen}
        />
      ) : null}
    </ToolShell>
  );
}

/* ------------------------------------------------------------ */

function NeueWand({ onAngelegt }: { onAngelegt: (w: Wand, schluessel: string) => void }) {
  const { classes } = useClasses();
  const [titel, setTitel] = useState("");
  const [kursId, setKursId] = useState("");
  const [anzahl, setAnzahl] = useState(24);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const kurs = classes.find((k) => k.id === kursId);
  const namen = kurs
    ? kurs.students.slice(0, MAX_PLAETZE)
    : Array.from({ length: anzahl }, () => "");

  async function anlegen() {
    setLaeuft(true);
    setFehler(null);
    try {
      const antwort = await fetch("/api/galerie/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titel: titel || kurs?.name || "Galerie", namen }),
      });
      const { wand, schluessel } = await antwortOderFehler<{ wand: Wand; schluessel: string }>(
        antwort,
      );
      onAngelegt(wand, schluessel);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Panel title="Neue Wand anlegen" className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-5 p-5">
        <Field label="Titel" hint="Steht groß auf dem Beamer und auf den iPads.">
          <TextInput
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder={kurs ? `${kurs.name} – Plakate` : "z. B. 7b – Plakate Mittelalter"}
            maxLength={80}
          />
        </Field>

        <Field label="Plätze">
          <div className="relative">
            <select
              value={kursId}
              onChange={(e) => setKursId(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-line bg-surface-2 py-0 pr-10 pl-4 text-[0.95rem] text-ink outline-none"
            >
              <option value="">Ohne Kurs — Namen später von Hand</option>
              {classes.map((k) => (
                <option key={k.id} value={k.id}>
                  Aus Kurs {k.name} ({Math.min(k.students.length, MAX_PLAETZE)} Plätze)
                </option>
              ))}
            </select>
            <Icon
              name="back"
              size={16}
              className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 -rotate-90 text-muted"
            />
          </div>
        </Field>

        {kurs ? (
          <p className="text-sm text-muted">
            Jeder Name aus {kurs.name} bekommt einen Platz
            {kurs.students.length > MAX_PLAETZE
              ? ` — die ersten ${MAX_PLAETZE}, mehr gehen nicht`
              : ""}
            . Die Vornamen stehen dann auf dem Beamer und auf den iPads.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Stepper value={anzahl} onChange={setAnzahl} min={1} max={MAX_PLAETZE} suffix="Plätze" />
            <span className="text-sm text-muted">Namen danach direkt auf der Wand eintragen</span>
          </div>
        )}

        {fehler ? (
          <p className="text-sm" style={{ color: "var(--alert)" }} role="alert">
            {fehler}
          </p>
        ) : null}

        <Button
          variant="primary"
          icon="plus"
          onClick={anlegen}
          disabled={laeuft || namen.length === 0}
        >
          {laeuft ? "Wird angelegt …" : "Wand anlegen"}
        </Button>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------ */

function QrSpalte({
  wand,
  link,
  zeigen,
  onGross,
  onModus,
}: {
  wand: Wand;
  link: string;
  zeigen: boolean;
  onGross: () => void;
  onModus: () => void;
}) {
  const abgegeben = wand.plaetze.filter((p) => p.dateien.length > 0).length;
  return (
    <aside className="flex shrink-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)] lg:w-[min(30%,22rem)]">
      <h2
        className="font-display leading-tight font-bold text-balance"
        style={{ fontSize: zeigen ? "clamp(1.4rem, 2.2vw, 2.4rem)" : "1.35rem" }}
      >
        {wand.titel}
      </h2>
      {link ? (
        <button type="button" onClick={onGross} title="Groß zeigen" className="w-full">
          <QrCode
            text={link}
            label={`QR-Code für ${wand.titel}`}
            className="aspect-square w-full rounded-xl border border-line"
          />
        </button>
      ) : null}
      <p className="text-[0.95rem] leading-snug">
        Scannen, eigenen Namen antippen, Bild oder PDF ablegen.
      </p>
      <p className="break-all text-sm text-muted">{link.replace(/^https?:\/\//, "")}</p>
      <p className="mt-auto font-display text-lg font-semibold">
        {abgegeben} von {wand.plaetze.length} abgegeben
      </p>
      {zeigen ? (
        <button type="button" onClick={onModus} className="text-left text-sm text-muted underline">
          Bearbeiten
        </button>
      ) : null}
    </aside>
  );
}

/* ------------------------------------------------------------ */

function Werkzeugleiste({
  wand,
  meine,
  origin,
  onSpeichern,
  onLoeschen,
}: {
  wand: Wand;
  meine: MeineWand;
  origin: string;
  onSpeichern: (a: WandAenderung) => Promise<void>;
  onLoeschen: () => Promise<void>;
}) {
  const { classes } = useClasses();
  const [titel, setTitel] = useState(wand.titel);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState(false);

  async function ausfuehren(f: () => Promise<void>) {
    setFehler(null);
    try {
      await f();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  }

  /**
   * Namen aus einem Kurs der Reihe nach auf die Plaetze legen. Vorhandene
   * Plaetze behalten ihre Dateien; ueberzaehlige fallen weg.
   */
  function ausKurs(kursId: string) {
    const kurs = classes.find((k) => k.id === kursId);
    if (!kurs) return;
    const namen = kurs.students.slice(0, MAX_PLAETZE);
    const wegfallend = wand.plaetze.slice(namen.length).filter((p) => p.dateien.length > 0);
    if (
      wegfallend.length > 0 &&
      !window.confirm(
        `${kurs.name} hat nur ${namen.length} Namen. Die letzten ${wand.plaetze.length - namen.length} Plätze fallen weg — samt Dateien von ${wegfallend.map((p) => p.name || "ohne Namen").join(", ")}. Weiter?`,
      )
    ) {
      return;
    }
    void ausfuehren(() => onSpeichern({ namen }));
  }

  function platzDazu() {
    void ausfuehren(() => onSpeichern({ platzDazu: true }));
  }

  async function lehrerlinkKopieren() {
    await navigator.clipboard.writeText(`${origin}/galerie/?w=${meine.id}#k=${meine.schluessel}`);
    setKopiert(true);
    window.setTimeout(() => setKopiert(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TextInput
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          onBlur={() => {
            if (titel.trim() !== wand.titel) void ausfuehren(() => onSpeichern({ titel }));
          }}
          aria-label="Titel der Wand"
          maxLength={80}
          className="max-w-xs font-display font-semibold"
        />
        {classes.length > 0 ? (
          <div className="relative">
            <select
              value=""
              onChange={(e) => ausKurs(e.target.value)}
              aria-label="Namen aus Kurs übernehmen"
              className="h-11 appearance-none rounded-xl border border-line bg-surface-2 py-0 pr-10 pl-4 text-[0.95rem] text-ink outline-none"
            >
              <option value="">Namen aus Kurs …</option>
              {classes.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.students.length})
                </option>
              ))}
            </select>
            <Icon
              name="people"
              size={16}
              className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
            />
          </div>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          icon="plus"
          onClick={platzDazu}
          disabled={wand.plaetze.length >= MAX_PLAETZE}
        >
          Platz
        </Button>
        <span className="text-sm text-muted">
          {wand.plaetze.length} von {MAX_PLAETZE} Plätzen · {mb(belegtWand(wand))} belegt
        </span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={kopiert ? "check" : "external"}
            onClick={() => void lehrerlinkKopieren()}
            title="Link, mit dem du diese Wand auf einem anderen Rechner verwalten kannst. Nicht an Schüler geben."
          >
            {kopiert ? "Kopiert" : "Lehrerlink"}
          </Button>
          <Button variant="danger" size="sm" icon="trash" onClick={() => void ausfuehren(onLoeschen)}>
            Wand löschen
          </Button>
        </div>
      </div>
      {fehler ? (
        <p className="text-sm" style={{ color: "var(--alert)" }} role="alert">
          {fehler}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ */

function Raster({
  wand,
  zeigen,
  onOeffnen,
  onSpeichern,
}: {
  wand: Wand;
  zeigen: boolean;
  onOeffnen: (id: string) => void;
  onSpeichern: (a: WandAenderung) => Promise<void>;
}) {
  const n = wand.plaetze.length;
  // 32 Plaetze: 8 x 4 — so passt alles ohne Scrollen auf den Beamer.
  const spalten = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : n <= 24 ? 6 : 8;
  const [fehler, setFehler] = useState<string | null>(null);

  async function umbenennen(id: string, name: string) {
    setFehler(null);
    try {
      await onSpeichern({ umbenennen: { id, name } });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  }

  async function entfernen(platz: Platz) {
    if (n <= 1) return;
    if (
      platz.dateien.length > 0 &&
      !window.confirm(`Platz „${platz.name || "ohne Namen"}“ samt ${platz.dateien.length} Datei(en) entfernen?`)
    ) {
      return;
    }
    setFehler(null);
    try {
      await onSpeichern({ platzWeg: platz.id });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  }

  return (
    <>
      {fehler ? (
        <p className="text-sm" style={{ color: "var(--alert)" }} role="alert">
          {fehler}
        </p>
      ) : null}
      <div
        className="grid flex-1 auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-4 lg:[grid-template-columns:repeat(var(--spalten),minmax(0,1fr))]"
        style={{ ["--spalten" as string]: spalten }}
      >
        {wand.plaetze.map((platz, i) => (
          <Kachel
            key={`${platz.id}:${platz.name}`}
            nummer={i + 1}
            platz={platz}
            zeigen={zeigen}
            kompakt={spalten >= 6}
            onOeffnen={() => onOeffnen(platz.id)}
            onName={(name) => void umbenennen(platz.id, name)}
            onEntfernen={n > 1 ? () => void entfernen(platz) : undefined}
          />
        ))}
      </div>
    </>
  );
}

function Kachel({
  nummer,
  platz,
  zeigen,
  kompakt,
  onOeffnen,
  onName,
  onEntfernen,
}: {
  nummer: number;
  platz: Platz;
  zeigen: boolean;
  kompakt: boolean;
  onOeffnen: () => void;
  onName: (name: string) => void;
  onEntfernen?: () => void;
}) {
  const [name, setName] = useState(platz.name);

  const vorschau = platz.dateien.find((d) => istBild(d.typ));
  const anzahl = platz.dateien.length;
  const leer = anzahl === 0;

  return (
    <article
      className="group relative flex min-h-28 flex-col overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-sm)]"
      style={{ borderColor: leer ? "var(--line)" : "var(--accent)" }}
    >
      <button
        type="button"
        onClick={onOeffnen}
        disabled={leer}
        className="relative flex flex-1 items-center justify-center bg-surface-2 disabled:cursor-default"
        title={leer ? "Noch nichts abgegeben" : "Ansehen"}
      >
        {vorschau ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vorschau.url}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : anzahl > 0 ? (
          <span className="flex flex-col items-center gap-1 text-muted">
            <Icon name="board" size={kompakt ? 22 : 30} />
            <span className="text-xs font-semibold tracking-wide uppercase">PDF</span>
          </span>
        ) : (
          <span className="font-display text-2xl font-bold text-muted/40">{nummer}</span>
        )}
        {anzahl > 1 ? (
          <span
            className="absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-xs font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            {anzahl}
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
        {zeigen ? (
          <p
            className={`min-w-0 flex-1 truncate font-display font-semibold ${kompakt ? "text-[0.95rem]" : "text-lg"}`}
          >
            {platz.name || `Platz ${nummer}`}
          </p>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() !== platz.name) onName(name);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder={`Platz ${nummer}`}
              aria-label={`Name für Platz ${nummer}`}
              maxLength={40}
              className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-[0.95rem] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/70 focus:bg-surface-2"
            />
            {onEntfernen ? (
              <button
                type="button"
                onClick={onEntfernen}
                className="grid size-7 shrink-0 place-items-center rounded-md text-muted opacity-0 transition group-hover:opacity-100 hover:bg-surface-2 hover:text-ink focus:opacity-100"
                title="Platz entfernen"
                aria-label={`Platz ${nummer} entfernen`}
              >
                <Icon name="x" size={15} />
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ */

function PlatzAnsicht({
  platz,
  onSchliessen,
  onLoeschen,
}: {
  platz: Platz;
  onSchliessen: () => void;
  onLoeschen?: (url: string) => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const datei = platz.dateien[Math.min(index, platz.dateien.length - 1)];

  useHotkeys({
    ArrowRight: () => setIndex((i) => Math.min(platz.dateien.length - 1, i + 1)),
    ArrowLeft: () => setIndex((i) => Math.max(0, i - 1)),
  });

  // Letzte Datei geloescht: Ansicht schliessen.
  useEffect(() => {
    if (!datei) onSchliessen();
  }, [datei, onSchliessen]);

  if (!datei) return null;

  async function loeschen() {
    if (!onLoeschen || !window.confirm(`„${datei.name}“ löschen?`)) return;
    setFehler(null);
    try {
      await onLoeschen(datei.url);
      setIndex((i) => Math.max(0, i - 1));
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] backdrop-blur-md">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate font-display text-xl font-bold">
          {platz.name || "Ohne Namen"}
          <span className="ml-3 text-base font-normal text-muted">
            {datei.name} · {index + 1} von {platz.dateien.length} · {mb(belegt(platz))} von{" "}
            {mb(MAX_BYTES_PRO_PLATZ)}
          </span>
        </h2>
        {fehler ? <span style={{ color: "var(--alert)" }}>{fehler}</span> : null}
        <a
          href={datei.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="external" size={16} /> Öffnen
        </a>
        {onLoeschen ? <IconButton icon="trash" label="Datei löschen" onClick={() => void loeschen()} /> : null}
        <IconButton icon="x" label="Schließen" onClick={onSchliessen} />
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        {istBild(datei.typ) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={datei.url} alt={datei.name} className="max-h-full max-w-full rounded-lg object-contain" />
        ) : datei.typ === "application/pdf" ? (
          <iframe src={datei.url} title={datei.name} className="size-full rounded-lg border border-line bg-white" />
        ) : (
          <a href={datei.url} target="_blank" rel="noreferrer" className="text-lg underline">
            {datei.name} öffnen
          </a>
        )}

        {platz.dateien.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-[var(--shadow-sm)] disabled:opacity-30"
              aria-label="Vorherige Datei"
            >
              <Icon name="back" size={22} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(platz.dateien.length - 1, i + 1))}
              disabled={index >= platz.dateien.length - 1}
              className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-[var(--shadow-sm)] disabled:opacity-30"
              aria-label="Nächste Datei"
            >
              <Icon name="back" size={22} className="rotate-180" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
