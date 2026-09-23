# LMG Classroom Tools

**Live:** auf Vercel (Adresse nach dem Umzug hier eintragen)

Werkzeuge für den Unterricht am Leibniz-Montessori-Gymnasium Düsseldorf —
Timer, Lautstärke-Ampel,
Gruppeneinteilung, Sitzplan und mehr, im Corporate Design der Schule.

**Fast alles läuft im Browser.** Klassenlisten und Einstellungen liegen
ausschließlich im `localStorage` des jeweiligen Geräts und werden nirgendwohin
übertragen. Die einzige Ausnahme sind die Arbeitsblätter unter `/blaetter` (nicht
verlinkt, siehe unten): Die Dateien liegen für 90 Minuten in Vercel Blob.

## Loslegen

```bash
npm run dev
```

Dann <http://localhost:3000> öffnen.

## Die Werkzeuge

| Route | Was es macht |
| --- | --- |
| `/timer` | Countdown und Stoppuhr, wahlweise als Ziffern, als schrumpfender Ring oder ganz ohne Zahlen. Gong am Ende, „+1 Min“ im Lauf. Vorbelegbar per URL: `/timer?min=5&look=ring` |
| `/stundenuhr` | Zeigt die laufende Schulstunde und wie lange sie noch dauert. Stundenraster frei einstellbar |
| `/stationen` | Rotation mit Gong und Wechselbildschirm. Vorlagen für Stationenlauf, Think–Pair–Share und Placemat |
| `/ampel` | Lautstärke-Ampel. Misst den Raumpegel über das Mikrofon, Schwellen einstellbar, Ruhe-Punkte als Belohnung. Auch von Hand bedienbar |
| `/phasen` | Großbild für die Sozialform samt Lautstärke- und Hilfe-Regel, dazu der Arbeitsauftrag |
| `/gruppen` | Gruppeneinteilung nach Größe oder Anzahl — mit Anwesenheit, „diese zwei nicht zusammen“, frei anlegbaren Rollen und Gedächtnis für frühere Paarungen |
| `/mingle` | Gesprächsrunden zu zweit, dritt oder viert. Nach Ablauf der Zeit gongt es und alle gleiten in eine neue Zusammenstellung. Über „Abwesend“ bleiben Fehlende außen vor |
| `/zufall` | Namen ziehen — als Schnelldurchlauf oder am Glücksrad, wahlweise ohne Wiederholung |
| `/anzeige` | Ein Satz, die ganze Wand. Schriftgröße passt sich der Textlänge an |
| `/tafel` | Whiteboard mit Stift, Radierer, Raster und einer Abdeckung zum schrittweisen Aufdecken |
| `/sitzplan` | Sitzplan per Antippen, zufällig verteilbar, pro Klasse gespeichert |
| `/dienste` | Dienste rotieren automatisch nach Kalenderwoche |
| `/noten` | Punkte zu Note für Oberstufe und Sek I, dazu der volle Punkteschlüssel zum Ausdrucken |
| `/klassen` | Klassenlisten anlegen und pflegen, mit Export und Import als Datei |

### Rollen in der Gruppenarbeit

Unter `/gruppen` lässt sich eine eigene Rollenliste pflegen: anlegen,
umbenennen, löschen, per Haken aktivieren und in der Reihenfolge verschieben.
Die Reihenfolge entscheidet, wer welche Rolle bekommt — die erste aktive
Rolle geht an das erste Gruppenmitglied. Sind weniger Rollen aktiv als
Mitglieder da sind, gehen die übrigen leer aus.

## Bedienung vor der Klasse

- **Vollbild** über das Symbol oben rechts. Im Vollbild blendet sich die
  Kopfzeile nach kurzer Ruhe aus, sodass nur noch das Werkzeug zu sehen ist.
- **Tastatur:** `Leertaste` startet und pausiert, `R` setzt zurück, `1`–`4`
  schalten die Arbeitsphase um, `/` springt auf der Startseite ins Suchfeld.
- **Dunkles Design** über das Mond-Symbol — für abgedunkelte Räume.
- Laufende Timer halten den Bildschirm wach (Wake Lock).

## Aufbau

```
app/                 Eine Route je Werkzeug, alle statisch vorgerendert
components/          ToolShell (Rahmen), UI-Bausteine, Icons, Logo
lib/
  tools.ts           Registry — hier stehen Name, Kategorie und Farbe
  storage.ts         localStorage über useSyncExternalStore
  classes.ts         Klassenlisten
  grouping.ts        Gruppenalgorithmus mit Regeln und Historie
  useMicLevel.ts     Pegelmessung fürs Mikrofon
  hooks.ts           Uhr, Vollbild, Wake Lock, Tastenkürzel
```

Ein neues Werkzeug braucht zwei Dinge: einen Eintrag in `lib/tools.ts` und
eine Seite unter `app/<slug>/page.tsx`, die den Inhalt in `<ToolShell>`
verpackt. Startseite, Suche und Favoriten ziehen sich den Rest selbst.

## Datenschutz

- Keine Schülerdaten auf einem Server. Auf Vercel liegen nur hochgeladene
  Arbeitsblätter, und die nur für 90 Minuten.
- In den Klassenlisten stehen nur Vornamen.
- Die Ampel berechnet aus dem Mikrofonsignal ausschließlich die Lautstärke.
  Es wird nichts aufgezeichnet, gespeichert oder gesendet.
- Kein Tracking, keine Cookies, keine Einbindung von Drittanbietern.
  Schriftarten werden beim Bauen mitgeliefert, nicht zur Laufzeit geladen.

Weil alles im Browser bleibt: Ein anderer Rechner oder ein geleerter
Browserspeicher bedeutet, dass die Listen weg sind. Unter `/klassen` gibt es
dafür Export und Import als Datei.

## Logo

`components/Logo.tsx` enthält einen Nachbau des Signets aus zwei
Sprechblasen. Liegt die offizielle Logodatei vor, lässt sie sich dort
einsetzen — alles andere referenziert nur diese Komponente.

## Arbeitsblätter per QR-Code

`/blaetter` steht absichtlich **nicht** auf der Startseite und hat keinen
Rückweg dorthin. Wer die Adresse kennt, kann bis zu vier Dateien (PDF oder
Bild, je höchstens 25 MB) hochladen. Neben jedem Blatt steht ein QR-Code für
die iPads. Ein Passwort gibt es nicht; die Seite ist für Suchmaschinen
gesperrt (`noindex`).

Der Upload geht direkt vom Browser zu Vercel Blob; `app/api/blaetter/upload`
gibt ihn frei. Jede Datei liegt unter `blaetter/<Upload-Zeitpunkt>/<Name>`.
Damit niemand ohne Passwort den Speicher vollmacht, liegen höchstens 40
gültige Blätter gleichzeitig im Store.

Der QR-Code zeigt nicht auf die Datei selbst, sondern auf `/blatt/…`. Diese
Route leitet zur Datei weiter, solange die 90 Minuten laufen, und meldet
danach „abgelaufen“. Vercel Blob kennt kein Ablaufdatum; gelöscht wird bei
jedem neuen Upload und zusätzlich einmal täglich per Cron (`vercel.json`).
Vorzeitig löschen lässt sich nichts — „Ausblenden“ nimmt ein Blatt nur vom
Bildschirm. Sonst könnte jeder, der einen QR-Code gescannt hat, auch löschen.

Umgebungsvariablen bei Vercel:

| Variable | Woher |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Entsteht mit dem Blob-Store `lmg-blaetter` (Frankfurt, öffentlich) |
| `CRON_SECRET` | Optional, schützt den Aufräum-Cron |

Lokal testen: `vercel env pull .env.local`, dann `npm run dev`.

## Bauen und Veröffentlichen

Jeder Push auf `main` wird von Vercel gebaut und veröffentlicht, sobald das
Repository dort als Projekt verbunden ist. Fast alle Seiten sind weiterhin
statisch vorgerendert; nur die Routen unter `app/api/blaetter` und
`app/blatt` laufen als Functions.
