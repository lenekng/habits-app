# Plan: Zyklus- & Habit-Tracker (PWA)

Persönliche Single-User-App mit zwei Modulen: Zyklustracking mit Fokus auf Periodenvorhersage und Zusammenhangs-Analyse (Zyklusphasen ↔ Stimmung, Habits untereinander), und Habit-Tracker nach Vorbild des Monatsraster-Bildes. Symptothermale NFP-Auswertung (Sensiplan) ist ein optionales Zusatzmodul, nicht der Hauptzweck.

## 1. Getroffene Entscheidungen (Interview 2026-07-05)

| Frage | Entscheidung |
|---|---|
| Plattform | PWA (Web-App, auf iPhone-Homescreen installierbar) |
| Architektur | Komplett client-seitig: Daten in IndexedDB auf dem Gerät, statisches Hosting (GitHub Pages), keine Serverkomponente |
| Apple Health | Nur einmaliger Import historischer Zyklusdaten aus dem Health-XML-Export; keine laufende Anbindung, Temperatur wird manuell eingetragen |
| Zweck Zyklusmodul | Hauptzweck: Periodenvorhersage + Zusammenhänge verstehen (Zyklusphase ↔ Stimmung, Habits untereinander); Verhütung (NFP) als Nebeneffekt |
| NFP-Niveau | NFP ist neu → falls zur Verhütung genutzt: strenge Sensiplan-Umsetzung mit Erklärungen und Lernphase; als optionale letzte Ausbaustufe (v4) |
| Zyklus-Beobachtungen | Periode (Stärke), Basaltemperatur (mit Uhrzeit + Störungs-Flag), Zervixschleim (Sensiplan-Kategorien), Mittelschmerz, Brustspannen, Zwischenblutung |
| Habit-Liste | Wie Abschnitt 5, bestätigt; Habits konfigurierbar |
| Erinnerungen | Keine; App zeigt fehlende Tage im Monatsgrid |
| Reihenfolge | Erfassung (v1) → Zyklusbild & Analyse (v2) → Vorhersage (v3) → NFP-Modul (v4, optional) |

## 2. Architektur & Tech-Stack

- **Frontend:** Svelte 5 + Vite + TypeScript. Wenig Boilerplate, gut lesbar, leicht erweiterbar.
- **Persistenz:** IndexedDB über Dexie.js. Beim ersten Start `navigator.storage.persist()` anfordern, damit iOS die Daten nicht räumt (installierte PWA + persist macht Eviction unwahrscheinlich; Backups bleiben trotzdem Pflicht, s. Abschnitt 8).
- **Charts:** uPlot (klein, schnell) für Zeitreihen; Korrelationsmatrix als eigenes SVG/Canvas-Rendering.
- **PWA:** Web-App-Manifest + Service Worker (Precache aller Assets → voll offlinefähig). Kein Push, kein Sync.
- **Hosting:** GitHub Pages aus einem privaten Repo (Pages-Inhalt ist öffentlich erreichbar, enthält aber nur Code, nie Daten — alle Daten bleiben in IndexedDB auf dem Gerät).
- **Analyse extern:** CSV-Export als Brücke zu Jupyter/Pandas für alles, was über die eingebaute Analyse hinausgeht.

## 3. Datenmodell (IndexedDB, Dexie)

```
day_entries        (PK: date "YYYY-MM-DD")
  habits: { [habitId]: boolean | number | string[] }   // ja/nein, 1–4, Sport-Auswahl
  cycle: {
    bleeding: none|spotting|light|medium|heavy
    temperature: { value: °C, time: "HH:MM", disturbed: bool, disturbanceNote?: string, excluded: bool }
    mucus: t|Ø|f|S|S+          // Sensiplan-Kategorien
    midPain: bool, breastTenderness: bool, spotting: bool
    note?: string
  }

habit_definitions  (PK: habitId)
  name, type: bool|scale4|choice, choices?: string[], scaleLabels?: [4 strings],
  sortOrder, archivedAt?     // archivieren statt löschen → alte Daten bleiben auswertbar

cycles             (PK: startDate)   // abgeleitet, bei jeder Änderung neu berechnet
  startDate, endDate?, length?,
  ovulationEstimate?, tempShiftDay?, mucusPeakDay?,
  evaluation: { fertileStart, fertileEnd, rulesApplied[], learningPhase: bool }

settings           (Sprache-Labels, Lernphasen-Status, letzte Backup-Erinnerung, Schema-Version)
```

Migrationsstrategie: Dexie-Versionierung, Schema-Version in `settings`; Export/Import ist gleichzeitig der Migrationspfad im Notfall.

## 4. Modul Zyklus

### 4.1 Tägliche Erfassung
Ein Tagesformular (gleiche Maske wie Habits, s. Abschnitt 6): Blutungsstärke, Temperatur (Zahleneingabe °C mit zwei Nachkommastellen, Uhrzeit vorbelegt mit letzter Messzeit, Störungs-Checkbox), Schleimkategorie über fünf erklärte Buttons, Zusatzzeichen als Toggles.

Zervixschleim-Kategorien nach Sensiplan (Buttons zeigen Abkürzung + Kurzbeschreibung, aufsteigende Qualität):

| Kürzel | Bedeutung |
|---|---|
| t | trocken — trockenes, raues Gefühl, nichts sichtbar |
| Ø | nichts — nichts gefühlt, nichts gesehen |
| f | feucht — feuchtes Gefühl, aber kein Schleim sichtbar |
| S | Schleim minderer Qualität — dicklich, weißlich, cremig, klumpig |
| S+ | beste Qualität — glasklar, spinnbar, dehnbar; Gefühl nass/glitschig |

Störfaktoren-Hinweis: Wenn am Vortag Alkohol ≥ 3, „gut geschlafen" ≤ 2, Erkältung = ja, Medikamente = ja, auswärts geschlafen = ja oder Urlaub = ja eingetragen ist, schlägt die App beim Temperatureintrag automatisch das Störungs-Flag vor (nur Vorschlag, Entscheidung bleibt manuell). Saubere Temperaturreihen nützen primär der Eisprung-Erkennung und damit der Vorhersage — nicht nur NFP.

### 4.2 Eisprung-Erkennung (v2, gemeinsamer Kern)
Rückblickende Schätzung des Eisprungs — Grundlage für Phasen-Analyse und Vorhersage, später vom NFP-Modul wiederverwendet:

- **Temperaturanstieg:** 3-über-6-Regel (drei Messwerte über den sechs vorangehenden, dritte Messung ≥ 0,2 °C über dem Maximum der sechs), inkl. Ausnahmeregel 1 (4. Wert abwarten) und Ausnahmeregel 2 (ein Ausreißer unter den dreien darf ausgeklammert werden). Als gestört markierte Werte werden übersprungen, bleiben aber im Kurvenblatt sichtbar (eingeklammert dargestellt).
- **Schleimhöhepunkt** (letzter Tag der besten Qualität S+, Kategorien s. Tabelle in 4.1) als Plausibilitätscheck der Temperaturauswertung.
- **Ergebnis pro Zyklus:** geschätzter Eisprungtag → Zuordnung jedes Tages zu einer Phase (Menstruation / Follikelphase / Lutealphase) als abgeleitete Variable für Analyse und Vorhersage. Hierfür reicht ein Best-Guess; die konservative Doppelkontrolle ist Sache des NFP-Moduls (4.4).
- **Kurvenblatt (Basisversion):** Temperaturkurve mit Hilfslinie, Schleimsymbole, Blutung, Zusatzzeichen, markierte Eisprung-Schätzung.

Die Regel-Engine wird als pure Functions mit Unit-Tests gegen Beispielzyklen aus der NFP-Literatur gebaut — sie ist später der sicherheitskritische Kern des NFP-Moduls.

### 4.3 Vorhersage (v3)
Zweistufig, transparent statt Blackbox:

1. **Vor dem Eisprung:** Verteilung der historischen Zykluslängen (inkl. Health-Import) → Vorhersage als Intervall, z. B. Median ± Quantile („Tag 27–33, wahrscheinlichster Tag 29"). Bei 21–35 Tagen Streuung ist ein breites Intervall die ehrliche Antwort.
2. **Nach bestätigtem Temperaturanstieg:** Eisprung + individuelle Lutealphasenlänge (aus den eigenen ausgewerteten Zyklen, die Lutealphase ist intraindividuell nahezu konstant) → Vorhersage verengt sich auf ±1–2 Tage. Das ist der größte Genauigkeitshebel, nicht ML.
3. **Experimentierstufe (später, optional):** Als Jupyter-Notebooks auf dem CSV-Export prototypen; nur in die App übernehmen, was die Vorhersage nachweislich verbessert. Zwei getrennte Fragen mit unterschiedlichem Datenbedarf:
   - **Habit ↔ Habit** (Tagesauflösung, ab ~6 Monaten / 180+ Tagen sinnvoll): partielle Korrelationen (Confounder wie Urlaub/Stress rausrechnen), gelagte Regressionen, ggf. kleines graphisches Modell — beantwortet z. B., ob Alkohol den Schlaf direkt beeinflusst oder über Stress vermittelt.
   - **Habits → Zyklus** (Zyklusauflösung, ab ≥ ~15 ausgewerteten Zyklen): Regression der Follikelphasenlänge auf aggregierte Habit-Features (Stress, Schlaf, Erkältung in der Follikelphase).
   - Einordnung: Beobachtungsdaten liefern Zusammenhänge/Hypothesen, keine Kausalbeweise; Lag-Struktur und partielle Korrelationen geben aber Richtungshinweise.

### 4.4 NFP-Modul (v4, optional)
Aufbauend auf dem Eisprung-Schätzer aus 4.2; nur relevant, wenn die Auswertung tatsächlich zur Verhütung genutzt wird — bewusst als letzte Ausbaustufe:

- **Doppelkontrolle:** Unfruchtbar ab dem Abend, an dem Temperatur- und Schleimauswertung beide abgeschlossen sind (das spätere Ende zählt).
- **Zyklusanfang:** 5-Tage-Regel nur, solange keine frühere Temperaturhochlage bekannt ist; Minus-8-Regel sobald mindestens 12 dokumentierte Zyklen mit Temperaturauswertung vorliegen (die importierten Health-Altdaten zählen dafür nicht, da ohne Temperatur). Konservativste Regel gewinnt immer.
- **Lernphase:** Banner und konservative Anzeige („Auswertung noch nicht verlässlich") für die ersten 3 Zyklen bzw. solange die Doppelkontrolle in einem Zyklus nicht gelingt. Jede Fruchtbar/Unfruchtbar-Anzeige nennt die angewandte Regel als Begründung — das ist gleichzeitig der Lerneffekt.
- **Kurvenblatt-Overlay:** fruchtbares Fenster und Coverline mit Regelbegründung auf dem Basis-Kurvenblatt aus 4.2.

Abgrenzung (steht auch im UI): Die App ist ein privates Werkzeug, kein Medizinprodukt. Die Regelanwendung ersetzt nicht das Erlernen der Methode (Buch „Natürlich & sicher" bzw. Sensiplan-Arbeitsheft als Referenz beim Implementieren und Lernen).

## 5. Modul Habit-Tracker

| Habit | Typ |
|---|---|
| Geweint | ja/nein |
| Streit | ja/nein |
| GV | ja/nein |
| Erkältung | ja/nein |
| Soziale Kontakte | ja/nein |
| Auswärts geschlafen | ja/nein |
| Urlaub | ja/nein |
| Medikamente | ja/nein |
| Sport | Auswahl, mehrere möglich: Volleyball, Beachvolleyball, Gym, Laufen, Sonstiges |
| Alkohol | Skala 1–4 (Menge) |
| Stress | Skala 1–4 (wenig → viel) |
| Gefühle | Skala 1–4 (schlecht → gut) |
| Gut geschlafen | Skala 1–4 (schlecht → gut) |
| Ernährung | Skala 1–4 (ungesund → gesund) |

- Habits sind konfigurierbar: hinzufügen, umbenennen, Skalen-Labels ändern, archivieren (nie hart löschen). Neue Habits erscheinen ab Anlagedatum.
- „Kein Eintrag" wird strikt von „nein/0" unterschieden (fehlend ≠ negativ) — wichtig für die Korrelationen.

## 6. UI-Struktur

Vier Ansichten, Navigation über Tab-Leiste unten:

1. **Heute** (Startansicht): Tagesformular für Habits + Zyklus in einer Maske, für Eintrag in < 30 s. Datum wechselbar für Nachträge.
2. **Monat:** Raster wie das Vorbild-Bild — Zeilen = Habits + Periodenzeile, Spalten = Tage des Monats, farbige Marker (Skalenwert → Farbabstufung). Fehlende Tage deutlich als Lücke. Tap auf Zelle → Schnell-Editieren, Tap auf Spaltenkopf → Tagesformular.
3. **Zyklus:** aktuelles Kurvenblatt (v2), Zyklushistorie mit Längen-Statistik, Vorhersage-Anzeige (v3), optional Fruchtbar/Unfruchtbar-Anzeige (v4).
4. **Analyse** (v2): Verlaufsgraphen, Phasen-Profile und Korrelationsmatrix.

Sprache: Deutsch. Design mobil-first (primäres Gerät iPhone), Desktop funktioniert mit.

## 7. Analyse (v2)

- **Verlaufsgraphen:** jede numerische Größe (Skalen 1–4, Temperatur, abgeleitet: Sport-Häufigkeit, Zykluslänge) über Woche / Monat / gesamter Zeitraum; ja/nein-Habits als Häufigkeit pro Woche/Monat. Perioden- und Phasen-Tage als Hintergrundbänder in jedem Zeitreihen-Plot.
- **Phasen-Profile** (direkte Antwort auf „wie beeinflusst der Zyklus meine Stimmung"): Mittelwert jeder 1–4-Skala je Zyklusphase, plus überlagerte Darstellung aller Zyklen relativ zum Zyklusstart bzw. Eisprung ausgerichtet — so wird z. B. ein PMS-Muster in Gefühle/Schlaf sichtbar, sobald einige Zyklen zusammen sind.
- **Korrelationsmatrix:** Spearman-Rangkorrelation (passend für ordinale 1–4-Skalen, funktioniert auch für binäre Variablen). Auswählbare Variablen; zusätzlich abgeleitete Variablen: Zyklustag, Zyklusphase (Menstruation / Follikel / Lutealphase), Zykluslänge.
- **Zeitversatz:** Matrix umschaltbar zwischen Lag 0 (gleicher Tag) und Lag 1 (Variable A heute ↔ Variable B morgen) — sonst ist „Alkohol ↔ gut geschlafen" falsch gepaart, da der Schlaf-Eintrag zur Nacht danach gehört.
- **Ehrlichkeit der Statistik:** Zellen zeigen n; Zellen mit n < 20 werden ausgegraut; Hinweis auf multiples Testen (bei 12 Variablen sind zufällige „Signifikanzen" garantiert). Die Matrix ist Hypothesen-Generator, kein Beweis.

## 8. Apple-Health-Import & Backup

- **Health-Import (einmalig, v1):** Health-App → Profil → „Alle Gesundheitsdaten exportieren" → ZIP mit `Export.xml`. Import-Screen nimmt die ZIP entgegen, parst im Browser (Streaming, die Datei kann groß sein) die Typen `MenstrualFlow`, `CervicalMucusQuality`, `BasalBodyTemperature`, `IntermenstrualBleeding`, `AbdominalCramps` und schreibt sie als day_entries. Duplikate idempotent (Re-Import überschreibt nicht Manuelles).
- **Backup:** JSON-Vollexport (alle Stores + Schema-Version) über iOS-Share-Sheet → iCloud Drive. Die App zeigt auf der Heute-Ansicht einen dezenten Hinweis, wenn das letzte Backup > 14 Tage her ist (kein Push, nur In-App). JSON-Import stellt vollständig wieder her.
- **CSV-Export:** eine flache Tabelle (Zeile = Tag, Spalten = alle Variablen) für Jupyter/Pandas.

## 9. Phasenplan

**v1 — Erfassung (ab hier täglich nutzbar):**
Projekt-Setup (Vite + Svelte + TS, PWA-Grundgerüst, Dexie-Schema) · Tagesformular Habits + Zyklus · Monatsgrid mit Lücken-Anzeige · Habit-Konfiguration · Health-XML-Import · JSON-Backup/Restore + CSV-Export · Deployment GitHub Pages, Installation auf dem iPhone.

**v2 — Zyklusbild & Analyse:**
Zyklus-Erkennung (Zyklusstart aus Blutung) · Eisprung-Schätzer (3-über-6 inkl. Ausnahmeregeln + Ausklammern, Schleimhöhepunkt als Plausibilitätscheck; pure Functions mit Unit-Tests gegen Literatur-Beispielzyklen) · Störfaktor-Vorschlag aus Habit-Daten · Kurvenblatt (Basisversion) · Verlaufsgraphen mit Zeitraum-Umschaltung und Phasen-Hintergrundbändern · Phasen-Profile · Korrelationsmatrix (Spearman, Lag 0/1, n-Anzeige) · abgeleitete Variablen (Zyklustag, Phase, Zykluslänge).

**v3 — Vorhersage:**
Statistisches Intervall aus Zykluslängen · Verengung nach Temperaturanstieg über individuelle Lutealphase · Anzeige in der Zyklus-Ansicht · Experimentierstufe (Jupyter, Habit-Features) separat, sobald genug Daten.

**v4 — NFP-Modul (optional):**
Doppelkontrolle · Zyklusanfangsregeln (5-Tage-/Minus-8-Regel) · Lernphasen-Logik + Regel-Erklärungen · Kurvenblatt-Overlay (fruchtbares Fenster, Coverline mit Regelbegründung). Erst bauen, wenn du die Auswertung wirklich zur Verhütung nutzen willst.

## 10. Risiken & Grenzen

- **iOS-Storage-Eviction:** Restrisiko trotz `storage.persist()` → Backup-Disziplin ist die eigentliche Absicherung.
- **NFP-Korrektheit:** Fehler in der Regelimplementierung haben reale Konsequenzen — aber erst, wenn das NFP-Modul (v4) tatsächlich zur Verhütung genutzt wird; für Analyse und Vorhersage ist der Eisprung-Schätzer nur eine Schätzgröße ohne Sicherheitsanspruch. Gegenmaßnahmen ab v4: Regel-Engine als pure Functions mit Testfällen aus der Literatur, Anzeige immer mit Begründung, Lernphase, Parallel-Auswertung von Hand in den ersten Zyklen.
- **Kein Medizinprodukt:** App unterstützt die selbst erlernte Methode, ersetzt sie nicht.
- **Datenverlust Browser-Wechsel:** Daten hängen an Safari/dieser Installation; Gerätewechsel läuft über JSON-Export/-Import.
