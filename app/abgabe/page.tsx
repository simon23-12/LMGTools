"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Icon } from "@/components/Icons";
import { LmgMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/Theme";
import { Button } from "@/components/ui";
import { useStored } from "@/lib/storage";
import {
  ERLAUBTE_TYPEN,
  MAX_BYTES_PRO_PLATZ,
  MAX_DATEIEN_PRO_PLATZ,
  belegt,
  dateiPfad,
  geheimnis,
  istBild,
  istId,
  mb,
  type Platz,
  type Wand,
} from "@/lib/galerie";
import { antwortOderFehler, useAdresse, useWand, verkleinern } from "@/lib/galerie-client";
import { sha256Browser } from "@/lib/galerie-hash";

/* ---------------------------------------------------------------
   Abgabe — die Seite hinter dem QR-Code der Galerie.
   Namen antippen, Bild oder PDF ablegen. Loeschen darf nur das
   iPad, von dem die Datei kam: Es merkt sich ein geheimes Token.
----------------------------------------------------------------- */

type Laeuft = { id: number; name: string; prozent: number };

export default function AbgabePage() {
  const { origin, search } = useAdresse();
  const w = new URLSearchParams(search).get("w");
  const wandId = istId(w) ? w : null;
  // origin ist erst im Browser gesetzt — vorher nicht vorschnell "ungueltig".
  const ungueltig = origin !== "" && !wandId;

  const { wand, fehler, uebernehmen } = useWand(wandId, 20_000);
  const [gewaehlt, setGewaehlt] = useStored<Record<string, string>>("abgabe.platz", {});
  const platzId = wandId ? gewaehlt[wandId] : undefined;
  const platz = wand?.plaetze.find((p) => p.id === platzId);

  function waehlen(id: string | null) {
    if (!wandId) return;
    setGewaehlt((prev) => {
      const neu = { ...prev };
      if (id) neu[wandId] = id;
      else delete neu[wandId];
      return neu;
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4">
          <LmgMark size={26} />
          <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">
            {wand?.titel ?? "Abgabe"}
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <main
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6"
        style={{ ["--accent" as string]: "var(--a-pink)" }}
      >
        {ungueltig ? (
          <Hinweis titel="Link ungültig" text="Bitte den QR-Code am Beamer noch einmal scannen." />
        ) : !wand ? (
          fehler ? (
            <Hinweis titel="Nicht erreichbar" text={fehler} />
          ) : (
            <p className="py-20 text-center text-muted">Wird geladen …</p>
          )
        ) : platz ? (
          <MeinPlatz
            wand={wand}
            platz={platz}
            onZurueck={() => waehlen(null)}
            onWand={uebernehmen}
          />
        ) : (
          <Namenswahl wand={wand} onWahl={waehlen} />
        )}
      </main>
    </div>
  );
}

function Hinweis({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="py-20 text-center">
      <h2 className="mb-2 font-display text-2xl font-bold" style={{ color: "var(--lmg-blue)" }}>
        {titel}
      </h2>
      <p className="text-muted">{text}</p>
    </div>
  );
}

function Namenswahl({ wand, onWahl }: { wand: Wand; onWahl: (id: string) => void }) {
  return (
    <>
      <h2 className="font-display text-2xl font-bold">Wer bist du?</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {wand.plaetze.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onWahl(p.id)}
            className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-left font-display text-lg font-semibold shadow-[var(--shadow-sm)] transition hover:bg-surface-2 active:scale-[0.98]"
          >
            <span className="min-w-0 truncate">{p.name || `Platz ${i + 1}`}</span>
            {p.dateien.length > 0 ? (
              <Icon name="check" size={20} className="shrink-0" style={{ color: "var(--a-green)" }} />
            ) : null}
          </button>
        ))}
      </div>
    </>
  );
}

function MeinPlatz({
  wand,
  platz,
  onZurueck,
  onWand,
}: {
  wand: Wand;
  platz: Platz;
  onZurueck: () => void;
  onWand: (w: Wand) => void;
}) {
  const [tokens, setTokens] = useStored<Record<string, string>>("abgabe.tokens", {});
  const [laeuft, setLaeuft] = useState<Laeuft[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ziehen, setZiehen] = useState(false);
  const dateiRef = useRef<HTMLInputElement>(null);

  const genutzt = belegt(platz);
  const voll = platz.dateien.length >= MAX_DATEIEN_PRO_PLATZ || genutzt >= MAX_BYTES_PRO_PLATZ;

  async function hochladen(dateien: File[]) {
    setFehler(null);
    // Nacheinander, damit die Grenze pro Platz verlaesslich greift.
    for (const original of dateien) {
      const typ = original.type || (original.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
      if (!ERLAUBTE_TYPEN.includes(typ)) {
        setFehler(
          `${original.name}: nur Bilder oder PDF. Eine Präsentation bitte vorher als PDF exportieren (Keynote/PowerPoint: Teilen → PDF).`,
        );
        continue;
      }
      const id = Date.now() + Math.random();
      setLaeuft((l) => [...l, { id, name: original.name, prozent: 0 }]);
      try {
        const datei = await verkleinern(original);
        if (datei.size > MAX_BYTES_PRO_PLATZ) {
          throw new Error(`${original.name} ist größer als ${mb(MAX_BYTES_PRO_PLATZ)}.`);
        }
        const blob = await upload(dateiPfad(wand.id, platz.id, datei.name), datei, {
          access: "public",
          handleUploadUrl: "/api/galerie/upload/",
          contentType: datei.type || typ,
          multipart: datei.size > 8 * 1024 * 1024,
          onUploadProgress: ({ percentage }) =>
            setLaeuft((l) => l.map((x) => (x.id === id ? { ...x, prozent: percentage } : x))),
        }).catch(() => {
          throw new Error(
            `${original.name} konnte nicht hochgeladen werden. Ist dein Platz voll? Sonst Internet prüfen und noch einmal versuchen.`,
          );
        });

        const token = geheimnis();
        const eintrag = JSON.stringify({
          aktion: "eintragen",
          url: blob.url,
          name: original.name,
          loeschHash: await sha256Browser(token),
        });
        // Die Datei liegt schon im Speicher — das Eintragen darf nicht an
        // einem kurzen Gedraenge scheitern, sonst waere sie verwaist.
        let antwort: Response | null = null;
        for (let versuch = 0; versuch < 4; versuch++) {
          antwort = await fetch(`/api/galerie/${wand.id}/`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: eintrag,
          });
          if (antwort.status !== 503) break;
          await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
        }
        const neu = await antwortOderFehler<Wand>(antwort!);
        setTokens((prev) => ({ ...prev, [blob.url]: token }));
        onWand(neu);
      } catch (e) {
        setFehler(e instanceof Error ? e.message : "Hochladen fehlgeschlagen.");
      } finally {
        setLaeuft((l) => l.filter((x) => x.id !== id));
      }
    }
  }

  async function loeschen(url: string) {
    setFehler(null);
    try {
      const antwort = await fetch(`/api/galerie/${wand.id}/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aktion: "loeschen", url, token: tokens[url] }),
      });
      onWand(await antwortOderFehler<Wand>(antwort));
      setTokens((prev) => {
        const neu = { ...prev };
        delete neu[url];
        return neu;
      });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
    }
  }

  return (
    <div
      className="flex flex-col gap-5"
      onDragOver={(e) => {
        e.preventDefault();
        setZiehen(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setZiehen(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setZiehen(false);
        if (!voll) void hochladen(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 font-display text-3xl font-bold">{platz.name || "Dein Platz"}</h2>
        <Button variant="ghost" size="sm" onClick={onZurueck}>
          Nicht du? Anderen Namen wählen
        </Button>
      </div>

      {fehler ? (
        <p
          className="rounded-xl px-4 py-2.5 text-[0.95rem]"
          style={{ background: "color-mix(in srgb, var(--alert) 12%, transparent)", color: "var(--alert)" }}
          role="alert"
        >
          {fehler}
        </p>
      ) : null}

      {!voll ? (
        <button
          type="button"
          onClick={() => dateiRef.current?.click()}
          className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition hover:bg-surface-2"
          style={{
            borderColor: ziehen ? "var(--accent)" : "var(--line-strong)",
            color: ziehen ? "var(--accent)" : "var(--ink-muted)",
          }}
        >
          <Icon name="upload" size={40} />
          <span className="font-display text-xl font-semibold text-ink">
            Bild oder PDF hierher ziehen
          </span>
          <span>oder antippen zum Auswählen</span>
        </button>
      ) : (
        <p className="rounded-2xl border border-line bg-surface-2 p-5 text-center text-muted">
          Dein Platz ist voll. Lösche erst eine Datei, wenn du etwas Neues ablegen willst.
        </p>
      )}

      <p className="text-sm text-muted">
        {platz.dateien.length} von {MAX_DATEIEN_PRO_PLATZ} Dateien · {mb(genutzt)} von{" "}
        {mb(MAX_BYTES_PRO_PLATZ)} belegt · Fotos werden automatisch verkleinert
      </p>

      {laeuft.map((l) => (
        <div key={l.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <p className="truncate font-medium">{l.name}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${l.prozent}%`, background: "var(--accent)" }}
            />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {platz.dateien.map((d) => (
          <figure
            key={d.url}
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]"
          >
            <a href={d.url} target="_blank" rel="noreferrer" className="grid aspect-[4/3] place-items-center bg-surface-2">
              {istBild(d.typ) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.url} alt={d.name} className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-muted">
                  <Icon name="board" size={30} />
                  <span className="text-xs font-semibold uppercase">PDF</span>
                </span>
              )}
            </a>
            <figcaption className="flex items-center gap-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              {tokens[d.url] ? (
                <button
                  type="button"
                  onClick={() => void loeschen(d.url)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`${d.name} löschen`}
                  title="Löschen"
                >
                  <Icon name="trash" size={17} />
                </button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>

      <input
        ref={dateiRef}
        type="file"
        accept={[...ERLAUBTE_TYPEN, ".pdf"].join(",")}
        multiple
        hidden
        onChange={(e) => {
          void hochladen(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
