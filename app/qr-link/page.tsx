"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { ToolShell } from "@/components/ToolShell";
import { Icon } from "@/components/Icons";
import { QrCode } from "@/components/QrCode";
import { Button, Kbd } from "@/components/ui";
import { useHotkeys } from "@/lib/hooks";
import { useStored } from "@/lib/storage";

export default function QrLinkPage() {
  return (
    <Suspense fallback={null}>
      <QrLink />
    </Suspense>
  );
}

/** "lmg.de/x" wird zu "https://lmg.de/x" — Kameras oeffnen sonst nichts. */
function normalisieren(eingabe: string): string {
  const t = eingabe.trim();
  if (!t) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  if (/^[^\s]+\.[^\s]{2,}/.test(t)) return `https://${t}`;
  return t;
}

/** Fuer Anzeige und Dateinamen: ohne https:// und ohne Schraegstrich am Ende. */
function kurz(link: string): string {
  return link.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function QrLink() {
  const params = useSearchParams();
  // Vorbelegen per URL: /qr-link?url=lmg-tools.vercel.app
  const [entwurf, setEntwurf] = useState(params.get("url") ?? "");
  const [verlauf, setVerlauf] = useStored<string[]>("qrlink.verlauf", []);
  const [gross, setGross] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  const link = normalisieren(entwurf);

  function merken(l: string) {
    if (!l) return;
    setVerlauf((prev) => [l, ...prev.filter((x) => x !== l)].slice(0, 8));
  }

  async function herunterladen() {
    if (!link) return;
    merken(link);
    const url = await QRCode.toDataURL(link, {
      errorCorrectionLevel: "M",
      margin: 3,
      width: 1200,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${kurz(link).replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.png`;
    a.click();
  }

  async function kopieren() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setKopiert(true);
      window.setTimeout(() => setKopiert(false), 1500);
    } catch {
      /* ohne Freigabe einfach nichts tun */
    }
  }

  useHotkeys({
    Escape: () => setGross(false),
  });

  return (
    <ToolShell
      slug="qr-link"
      hint={
        <>
          <Kbd>Enter</Kbd> groß zeigen · <Kbd>Esc</Kbd> zurück
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <section className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!link) return;
              merken(link);
              setGross(true);
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="mb-1.5 block text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
                Link
              </span>
              <input
                value={entwurf}
                onChange={(e) => setEntwurf(e.target.value)}
                placeholder="z. B. lmg-tools.vercel.app"
                autoFocus
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-2xl border border-line bg-surface-2 px-4 text-lg text-ink outline-none transition placeholder:text-muted/70"
                aria-label="Link, der zum QR-Code werden soll"
              />
            </label>

            <div className="flex flex-wrap gap-2.5">
              <Button type="submit" variant="primary" icon="expand" disabled={!link}>
                Groß zeigen
              </Button>
              <Button
                type="button"
                variant="soft"
                icon="download"
                disabled={!link}
                onClick={() => void herunterladen()}
              >
                Als Bild speichern
              </Button>
              <Button
                type="button"
                variant="outline"
                icon="link"
                disabled={!link}
                onClick={() => void kopieren()}
              >
                {kopiert ? "Kopiert" : "Link kopieren"}
              </Button>
              {entwurf ? (
                <Button type="button" variant="ghost" icon="x" onClick={() => setEntwurf("")}>
                  Leeren
                </Button>
              ) : null}
            </div>
          </form>

          {verlauf.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.78rem] font-semibold text-muted uppercase">
                  Zuletzt
                </span>
                <button
                  type="button"
                  onClick={() => setVerlauf([])}
                  className="text-[0.8rem] text-muted transition hover:text-ink"
                >
                  Verlauf löschen
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {verlauf.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEntwurf(v)}
                    className="max-w-full truncate rounded-lg bg-surface-2 px-2.5 py-1 text-[0.85rem] text-muted transition hover:text-ink"
                    title={v}
                  >
                    {kurz(v)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col items-center gap-4">
          {link ? (
            <>
              <button
                type="button"
                onClick={() => {
                  merken(link);
                  setGross(true);
                }}
                className="w-full max-w-[460px] transition hover:scale-[1.01]"
                title="Groß zeigen"
              >
                <QrCode
                  text={link}
                  label={`QR-Code für ${link}`}
                  className="aspect-square h-auto w-full rounded-2xl border border-line"
                />
              </button>
              <p className="max-w-full text-center text-sm break-all text-muted">{link}</p>
            </>
          ) : (
            <div className="flex aspect-square w-full max-w-[460px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong p-6 text-center text-muted">
              <Icon name="qr" size={40} />
              <span className="font-display text-lg font-semibold text-ink">
                Link eintippen oder einfügen
              </span>
              <span className="text-sm">Der QR-Code erscheint sofort hier.</span>
            </div>
          )}
        </section>
      </div>

      {gross && link ? (
        <button
          type="button"
          onClick={() => setGross(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6 backdrop-blur-md"
          aria-label="Schließen"
        >
          <QrCode
            text={link}
            label={`QR-Code für ${link}`}
            className="aspect-square h-auto w-[min(86vw,74vh)] rounded-2xl"
          />
          <p className="font-display max-w-[90vw] text-center text-[clamp(1.25rem,3vw,2.5rem)] font-bold break-all">
            {kurz(link)}
          </p>
        </button>
      ) : null}
    </ToolShell>
  );
}
