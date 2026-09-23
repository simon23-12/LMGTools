"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { QrCode } from "@/components/QrCode";
import { Button, IconButton, Kbd, Segmented, TextInput } from "@/components/ui";
import { useHotkeys, useNow } from "@/lib/hooks";
import { useStored } from "@/lib/storage";
import {
  ERLAUBTE_TYPEN,
  LAUFZEIT_MS,
  MAX_BLAETTER,
  MAX_BYTES,
  blattPfad,
  freigabeLink,
} from "@/lib/blaetter";

/* ---------------------------------------------------------------
   Arbeitsblaetter
   Die Lehrkraft laedt bis zu vier Dateien hoch, neben jedem Blatt
   steht ein QR-Code. Die iPads scannen und oeffnen das PDF. Nach 90
   Minuten fuehrt der Code ins Leere, und die Datei wird geloescht.

   Die Seite steht bewusst nicht auf der Startseite und fuehrt auch
   nicht dorthin zurueck: Wer den Link nicht kennt, findet sie nicht.
   Ein Passwort gibt es deshalb nicht.
----------------------------------------------------------------- */

const SHELL = { name: "Arbeitsblätter", accent: "var(--a-teal)" };

type Blatt = {
  url: string;
  link: string;
  titel: string;
  zeit: number;
};

type Laeuft = { id: number; name: string; prozent: number };

type Modus = "bearbeiten" | "zeigen";

function titelAusDatei(name: string): string {
  const punkt = name.lastIndexOf(".");
  return (punkt > 0 ? name.slice(0, punkt) : name).replace(/[_]+/g, " ").trim();
}

export default function BlaetterPage() {
  const [blaetter, setBlaetter] = useStored<Blatt[]>("blaetter.liste", []);
  const [modus, setModus] = useState<Modus>("bearbeiten");
  const [laeuft, setLaeuft] = useState<Laeuft[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gross, setGross] = useState<Blatt | null>(null);
  const [ziehen, setZiehen] = useState(false);
  const dateiRef = useRef<HTMLInputElement>(null);
  const now = useNow(1000);

  const aktiv = blaetter.filter((b) => now - b.zeit < LAUFZEIT_MS);
  const frei = MAX_BLAETTER - aktiv.length - laeuft.length;

  // Abgelaufene fliegen aus der Liste; die Dateien raeumt der Server weg.
  useEffect(() => {
    if (blaetter.some((b) => now - b.zeit >= LAUFZEIT_MS)) {
      setBlaetter((prev) => prev.filter((b) => now - b.zeit < LAUFZEIT_MS));
    }
  }, [now, blaetter, setBlaetter]);

  useHotkeys({
    Escape: () => setGross(null),
    z: () => setModus((m) => (m === "zeigen" ? "bearbeiten" : "zeigen")),
  });

  async function hochladen(dateien: File[]) {
    setFehler(null);
    const auswahl = dateien.slice(0, Math.max(0, frei));
    if (dateien.length > auswahl.length) {
      setFehler(`Höchstens ${MAX_BLAETTER} Blätter gleichzeitig.`);
    }

    await Promise.all(
      auswahl.map(async (datei) => {
        if (!ERLAUBTE_TYPEN.includes(datei.type)) {
          setFehler(`${datei.name}: nur PDF oder Bilder.`);
          return;
        }
        if (datei.size > MAX_BYTES) {
          setFehler(`${datei.name} ist größer als 25 MB.`);
          return;
        }

        const id = Date.now() + Math.random();
        setLaeuft((l) => [...l, { id, name: datei.name, prozent: 0 }]);
        try {
          const zeit = Date.now();
          const blob = await upload(blattPfad(zeit, datei.name), datei, {
            access: "public",
            handleUploadUrl: "/api/blaetter/upload/",
            contentType: datei.type,
            multipart: datei.size > 8 * 1024 * 1024,
            onUploadProgress: ({ percentage }) =>
              setLaeuft((l) =>
                l.map((x) => (x.id === id ? { ...x, prozent: percentage } : x)),
              ),
          });
          const neu: Blatt = {
            url: blob.url,
            link: freigabeLink(window.location.origin, blob.url),
            titel: titelAusDatei(datei.name),
            zeit,
          };
          setBlaetter((prev) => [...prev, neu].slice(-MAX_BLAETTER));
        } catch {
          // Die Blob-Bibliothek verschluckt den Grund vom Server.
          setFehler(
            `${datei.name} konnte nicht hochgeladen werden. Internet weg oder Speicher gerade voll — in ein paar Minuten noch einmal versuchen.`,
          );
        } finally {
          setLaeuft((l) => l.filter((x) => x.id !== id));
        }
      }),
    );
  }

  /**
   * Nimmt Blaetter nur vom Bildschirm. Loeschen kann ohne Passwort nur
   * die Laufzeit — sonst koennte jeder mit einem QR-Code auch loeschen.
   */
  function ausblenden(urls: string[]) {
    setBlaetter((prev) => prev.filter((b) => !urls.includes(b.url)));
  }

  function umbenennen(url: string, titel: string) {
    setBlaetter((prev) => prev.map((b) => (b.url === url ? { ...b, titel } : b)));
  }

  const zeigen = modus === "zeigen";
  const anzahl = aktiv.length + (zeigen ? 0 : laeuft.length + (frei > 0 ? 1 : 0));
  // Zwei Spalten ab zwei Blaettern: So bleiben Titel und QR-Code
  // nebeneinander gross genug, auch bei vier Blaettern im 2x2-Raster.
  const spalten = anzahl <= 1 ? "lg:grid-cols-1" : "lg:grid-cols-2";

  return (
    <ToolShell
      slug="blaetter"
      eigenstaendig={SHELL}
      bleed
      hint={
        <>
          <Kbd>Z</Kbd> Zeigen/Bearbeiten · <Kbd>Esc</Kbd> QR verkleinern
        </>
      }
    >
      <div
        className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6"
        onDragOver={(e) => {
          if (zeigen) return;
          e.preventDefault();
          setZiehen(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setZiehen(false);
        }}
        onDrop={(e) => {
          if (zeigen) return;
          e.preventDefault();
          setZiehen(false);
          hochladen(Array.from(e.dataTransfer.files));
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<Modus>
            value={modus}
            onChange={setModus}
            options={[
              { value: "bearbeiten", label: "Bearbeiten" },
              { value: "zeigen", label: "Zeigen" },
            ]}
          />
          {!zeigen ? (
            <>
              <span className="text-sm text-muted">
                {aktiv.length} von {MAX_BLAETTER} Blättern · jedes gilt 90 Minuten
              </span>
              <div className="ml-auto flex gap-2">
                {aktiv.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon="x"
                    onClick={() => ausblenden(aktiv.map((b) => b.url))}
                    title="Nimmt alle Blätter vom Bildschirm. Die QR-Codes gelten bis zum Ablauf weiter."
                  >
                    Alle ausblenden
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {fehler && !zeigen ? (
          <p
            className="rounded-xl px-4 py-2.5 text-sm"
            style={{
              background: "color-mix(in srgb, var(--alert) 12%, transparent)",
              color: "var(--alert)",
            }}
            role="alert"
          >
            {fehler}
          </p>
        ) : null}

        {zeigen && aktiv.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center text-muted">
            <p className="font-display text-2xl font-semibold">
              Noch keine Blätter — unter „Bearbeiten“ hochladen.
            </p>
          </div>
        ) : (
          <div className={`grid flex-1 auto-rows-fr grid-cols-1 gap-4 ${spalten}`}>
            {aktiv.map((blatt, i) => (
              <BlattKarte
                key={blatt.url}
                nummer={i + 1}
                blatt={blatt}
                now={now}
                zeigen={zeigen}
                onTitel={(t) => umbenennen(blatt.url, t)}
                onAusblenden={() => ausblenden([blatt.url])}
                onGross={() => setGross(blatt)}
              />
            ))}

            {!zeigen
              ? laeuft.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-col justify-center gap-3 rounded-2xl border border-line bg-surface p-6"
                  >
                    <p className="truncate font-medium">{l.name}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{ width: `${l.prozent}%`, background: "var(--accent)" }}
                      />
                    </div>
                    <p className="text-sm text-muted">Wird hochgeladen … {Math.round(l.prozent)} %</p>
                  </div>
                ))
              : null}

            {!zeigen && frei > 0 ? (
              <button
                type="button"
                onClick={() => dateiRef.current?.click()}
                className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition hover:bg-surface-2"
                style={{
                  borderColor: ziehen ? "var(--accent)" : "var(--line-strong)",
                  color: ziehen ? "var(--accent)" : "var(--ink-muted)",
                }}
              >
                <Icon name="upload" size={34} />
                <span className="font-display text-lg font-semibold text-ink">
                  PDF oder Bild hierher ziehen
                </span>
                <span className="text-sm">
                  oder klicken zum Auswählen · noch {frei} {frei === 1 ? "Platz" : "Plätze"}
                </span>
              </button>
            ) : null}
          </div>
        )}

        <input
          ref={dateiRef}
          type="file"
          accept={ERLAUBTE_TYPEN.join(",")}
          multiple
          hidden
          onChange={(e) => {
            hochladen(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {gross ? (
        <button
          type="button"
          onClick={() => setGross(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 backdrop-blur-md"
          aria-label="Schließen"
        >
          <p className="font-display text-center text-[clamp(1.5rem,4vw,3rem)] font-bold">
            {gross.titel}
          </p>
          <QrCode
            text={gross.link}
            label={`QR-Code für ${gross.titel}`}
            className="aspect-square h-auto w-[min(80vw,72vh)] rounded-2xl"
          />
        </button>
      ) : null}
    </ToolShell>
  );
}

function BlattKarte({
  nummer,
  blatt,
  now,
  zeigen,
  onTitel,
  onAusblenden,
  onGross,
}: {
  nummer: number;
  blatt: Blatt;
  now: number;
  zeigen: boolean;
  onTitel: (titel: string) => void;
  onAusblenden: () => void;
  onGross: () => void;
}) {
  const restMin = Math.max(0, Math.ceil((blatt.zeit + LAUFZEIT_MS - now) / 60000));

  return (
    <article className="flex min-h-56 items-stretch gap-5 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl font-display text-xl font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          {nummer}
        </span>

        {zeigen ? (
          <h2
            className="font-display leading-tight font-bold text-balance"
            style={{ fontSize: "clamp(1.4rem, 2.6vw, 2.6rem)", hyphens: "auto" }}
          >
            {blatt.titel || `Blatt ${nummer}`}
          </h2>
        ) : (
          <TextInput
            value={blatt.titel}
            onChange={(e) => onTitel(e.target.value)}
            placeholder={`Blatt ${nummer}`}
            aria-label={`Titel von Blatt ${nummer}`}
            className="font-display text-lg font-semibold"
          />
        )}

        <p className="mt-auto text-sm text-muted">
          {restMin > 0 ? `Noch ${restMin} Min. abrufbar` : "Läuft ab"}
        </p>

        {!zeigen ? (
          <div className="flex flex-wrap gap-1">
            <a
              href={blatt.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <Icon name="external" size={16} /> Öffnen
            </a>
            <IconButton icon="expand" label="QR-Code groß zeigen" size={18} onClick={onGross} />
            <IconButton icon="x" label="Vom Bildschirm nehmen" size={18} onClick={onAusblenden} />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onGross}
        className="aspect-square w-[min(50%,max(10rem,38vh))] shrink-0 self-center"
        title="Groß zeigen"
      >
        <QrCode
          text={blatt.link}
          label={`QR-Code für ${blatt.titel || `Blatt ${nummer}`}`}
          className="size-full rounded-xl border border-line"
        />
      </button>
    </article>
  );
}
