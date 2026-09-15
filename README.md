# LMG Classroom Tools

**Live: <https://simon23-12.github.io/LMGTools/>**

Werkzeuge für den Unterricht am Lessing-Gymnasium — Timer, Lautstärke-Ampel,
Gruppeneinteilung, Sitzplan und mehr, im Corporate Design der Schule.

**Alles läuft im Browser.** Kein Server, keine Datenbank, keine Anmeldung.
Klassenlisten und Einstellungen liegen ausschließlich im `localStorage` des
jeweiligen Geräts und werden nirgendwohin übertragen.

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
| `/mingle` | Gesprächsrunden zu zweit, dritt oder viert. Nach Ablauf der Zeit gongt es und alle gleiten in eine neue Zusammenstellung |
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

- Keine Schülerdaten auf einem Server — es gibt keinen.
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

## Bauen und Veröffentlichen

```bash
npm run build
```

`output: "export"` erzeugt nach `out/` reines HTML, CSS und JavaScript —
keine Functions, keine Datenbank, nichts, was einen Node-Server bräuchte.

### GitHub Pages

Jeder Push auf `main` startet den Workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), der den
Export baut und veröffentlicht. Es ist kein Handgriff nötig; im Actions-Tab
lässt sich der Lauf auch von Hand auslösen.

Weil die Seite unter `/LMGTools/` liegt und nicht in der Wurzel, braucht
Next.js einen Basispfad. Der kommt aus `NEXT_PUBLIC_BASE_PATH` und wird im
Workflow aus dem Repository-Namen gebildet — ein Umbenennen des Repositorys
passt sich also von selbst an. Lokal ist die Variable leer, `npm run dev`
läuft deshalb weiter unter `http://localhost:3000/`.

Zwei Fälle, in denen der Basispfad **leer** sein muss: eine eigene Domain
(CNAME) oder ein Repository mit dem Namen `simon23-12.github.io`. Dann in
`.github/workflows/deploy.yml` die Zeile `NEXT_PUBLIC_BASE_PATH` entfernen.
