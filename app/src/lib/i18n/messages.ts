export type Lang = 'de' | 'en';
export type MsgParams = Record<string, string | number>;
type Msg = string | ((p: MsgParams) => string);

const de = {
  'nav.heute': 'Heute',
  'nav.monat': 'Monat',
  'nav.zyklus': 'Zyklus',
  'nav.analyse': 'Analyse',
  'nav.mehr': 'Mehr',

  'common.back': 'Zurück',
  'common.close': 'Schließen',
  'common.done': 'Fertig',
  'common.cancel': 'Abbrechen',
  'common.retry': 'Erneut versuchen',
  'common.loading': 'Laden…',
  'common.yes': 'Ja',
  'common.no': 'Nein',
  'common.noEntry': 'Kein Eintrag',
  'common.more': 'mehr',
  'common.less': 'weniger',

  'heute.prevDay': 'Vorheriger Tag',
  'heute.nextDay': 'Nächster Tag',
  'heute.pickDate': 'Datum wählen',
  'heute.backToToday': 'Zurück zu heute',
  'heute.backupOverdue': 'Letztes Backup liegt über 14 Tage zurück',
  'heute.toBackup': 'Zum Backup',
  'heute.saveFailed': 'Speichern fehlgeschlagen — letzte Änderung ist nicht gesichert.',

  'habits.heading': 'Habits',

  'cycle.heading': 'Zyklus',
  'cycle.bleeding': 'Blutung',
  'cycle.bleedingNone': 'keine',
  'cycle.basalTemp': 'Basaltemperatur',
  'cycle.disturbSuggest': (p: MsgParams) =>
    `Gestern: ${p.reasons} — Messung als gestört markieren?`,
  'cycle.markDisturbed': 'Als gestört markieren',
  'cycle.tempAria': 'Basaltemperatur in °C',
  'cycle.measureTime': 'Messzeit',
  'cycle.tempOutOfRange': 'Wert außerhalb von 34–42 °C — wurde nicht gespeichert.',
  'cycle.disturbed': 'Messung gestört',
  'cycle.reasonOptional': 'Grund (optional)',
  'cycle.exclude': 'Wert ausklammern',
  'cycle.excludedHint': 'Wird bei der späteren Auswertung übersprungen.',
  'cycle.mucus': 'Zervixschleim',
  'cycle.extras': 'Zusatzzeichen',
  'cycle.note': 'Notiz',
  'cycle.notePlaceholder': 'Notiz zum Tag',
  'cycle.tempPlaceholder': '36,50',

  'bleeding.spotting': 'Schmierblutung',
  'bleeding.light': 'leicht',
  'bleeding.medium': 'mittel',
  'bleeding.heavy': 'stark',

  'mucus.t': 'trocken: trockenes, raues Gefühl, nichts sichtbar',
  'mucus.none': 'nichts gefühlt, nichts gesehen',
  'mucus.f': 'feucht: feuchtes Gefühl, aber kein Schleim sichtbar',
  'mucus.S': 'Schleim minderer Qualität: dicklich, weißlich, cremig, klumpig',
  'mucus.Splus': 'beste Qualität: glasklar, spinnbar, dehnbar; Gefühl nass/glitschig',

  'sign.midPain': 'Mittelschmerz',
  'sign.breastTenderness': 'Brustspannen',
  'sign.spotting': 'Zwischenblutung',

  'monat.prevMonth': 'Voriger Monat',
  'monat.nextMonth': 'Nächster Monat',
  'monat.period': 'Periode',
  'monat.editPeriod': (p: MsgParams) => `Periode am ${p.n}. bearbeiten`,
  'monat.editHabit': (p: MsgParams) => `${p.name} am ${p.n}. bearbeiten`,
  'monat.openDay': (p: MsgParams) => `Tag ${p.n} im Tagesformular öffnen`,
  'monat.saveFailed': 'Speichern fehlgeschlagen — Änderung ist nicht gesichert.',
  'legend.yes': 'Ja',
  'legend.noRecorded': 'Nein (erfasst)',
  'legend.scale': 'Skala: 1 schlecht → 4 ideal',
  'legend.periodRange': 'Periode leicht–stark',
  'legend.spotting': 'Schmier-/Zwischenblutung',
  'legend.gap': 'Tag ohne Eintrag',
  'legend.empty': 'Leere Zelle: kein Eintrag',

  'mehr.heading': 'Mehr',
  'mehr.language': 'Sprache',
  'mehr.habitsLabel': 'Habits verwalten',
  'mehr.habitsHint': 'Anlegen, umbenennen, archivieren',
  'mehr.healthLabel': 'Apple-Health-Import',
  'mehr.healthHint': 'Einmaliger Import der Altdaten',
  'mehr.backupLabel': 'Backup & Export',
  'mehr.backupHint': 'JSON-Backup, CSV für Analysen',

  'habitcfg.heading': 'Habits verwalten',
  'habitcfg.moveAria': 'Verschieben',
  'habitcfg.newHabit': 'Neues Habit anlegen',
  'habitcfg.newHabitTitle': 'Neues Habit',
  'habitcfg.archivedToggle': (p: MsgParams) => `Archivierte Habits (${p.n})`,
  'habitcfg.archivedHint':
    'Archivierte Habits verschwinden aus Heute/Monat, ihre Daten bleiben für Analysen erhalten.',
  'habitcfg.reactivate': 'Reaktivieren',
  'badge.bool': 'Ja/Nein',
  'badge.scale4': 'Skala 1–4',
  'badge.choice': 'Auswahl',

  'habiteditor.name': 'Name',
  'habiteditor.scaleLabels': 'Skalen-Labels',
  'habiteditor.options': 'Optionen',
  'habiteditor.optionsHint': 'Alte Tageseinträge behalten entfernte Optionen.',
  'habiteditor.save': 'Speichern',
  'habiteditor.archive': 'Archivieren',
  'habiteditor.archiveHint':
    'Archivierte Habits verschwinden aus Heute/Monat, ihre Daten bleiben für Analysen erhalten.',
  'habiteditor.delete': 'Löschen',
  'habiteditor.deleteConfirm': 'Endgültig löschen? Alle erfassten Werte dieses Habits gehen verloren.',
  'habiteditor.deleteConfirmBtn': 'Endgültig löschen',
  'habiteditor.errNameEmpty': 'Name darf nicht leer sein.',
  'habiteditor.errScaleLabels': 'Alle vier Skalen-Labels ausfüllen.',
  'habiteditor.errOptions': 'Mindestens eine Option angeben.',
  'habiteditor.deleteFailed': 'Löschen fehlgeschlagen — bitte erneut versuchen.',

  'newhabit.namePlaceholder': 'z. B. Meditation',
  'newhabit.type': 'Typ',
  'newhabit.typeAria': 'Typ wählen',
  'newhabit.typeHint': 'Typ ist nach dem Anlegen nicht änderbar.',
  'newhabit.create': 'Anlegen',

  'choices.placeholder': 'Option',
  'choices.remove': 'Entfernen',
  'choices.add': 'Option hinzufügen',

  'backup.title': 'Backup & Export',
  'backup.createTitle': 'Backup erstellen',
  'backup.createHint':
    'Vollständiges JSON-Backup aller Daten (Tageseinträge, Habits, Zyklen, Einstellungen). Auf dem iPhone über das Share-Sheet in iCloud Drive oder „Dateien" sichern.',
  'backup.lastLabel': 'Letztes Backup:',
  'backup.never': 'noch nie',
  'backup.exportBtn': 'Backup exportieren',
  'backup.exported': 'Backup exportiert.',
  'backup.exportAborted': 'Export abgebrochen.',
  'backup.exportFailed': (p: MsgParams) => `Export fehlgeschlagen: ${p.err}`,
  'backup.restoreTitle': 'Backup wiederherstellen',
  'backup.restoreHint': 'Stellt ein zuvor exportiertes JSON-Backup vollständig wieder her.',
  'backup.jsonReadError': 'Datei konnte nicht als JSON gelesen werden.',
  'backup.summaryExportedAt': (p: MsgParams) => `Exportiert am: ${p.ts}`,
  'backup.summaryEntries': 'Tageseinträge',
  'backup.summaryRange': (p: MsgParams) => `(${p.from} bis ${p.to})`,
  'backup.summaryHabits': 'Habits',
  'backup.summaryCycles': 'Zyklen',
  'backup.summarySettings': 'Einstellungen',
  'backup.restoreBtn': 'Wiederherstellen …',
  'backup.restoreWarn':
    'Ersetzt ALLE vorhandenen Daten in der App. Das kann nicht rückgängig gemacht werden.',
  'backup.restoreConfirm': 'Ja, alle Daten ersetzen',
  'backup.restored': (p: MsgParams) =>
    `Backup wiederhergestellt: ${p.entries} Tageseinträge, ${p.habits} Habits.`,
  'backup.restoreFailed': (p: MsgParams) => `Wiederherstellung fehlgeschlagen: ${p.err}`,
  'backup.csvTitle': 'CSV-Export',
  'backup.csvHint':
    'Für Auswertungen in Jupyter/Pandas: eine Zeile pro Tag, eine Spalte pro Habit plus Zyklusdaten. Enthält keine Einstellungen und ersetzt kein Backup.',
  'backup.csvBtn': 'CSV exportieren',
  'backup.csvExported': (p: MsgParams) => `CSV exportiert (${p.n} Tage).`,

  'health.title': 'Apple-Health-Import',
  'health.intro':
    'So kommst du an den Export: In der Health-App auf dem iPhone oben rechts auf das Profilbild tippen und „Alle Gesundheitsdaten exportieren" wählen. Die erzeugte Export.zip hier auswählen (z. B. über die Dateien-App); eine bereits entpackte Export.xml funktioniert ebenfalls.',
  'health.introFields':
    'Importiert werden Blutung, Basaltemperatur, Zervixschleim, Zwischenblutung und Brustspannen. Perioden-Einträge ohne Stärkeangabe werden als „leicht" übernommen. Manuell eingetragene Werte werden nie überschrieben; ein erneuter Import derselben Datei ändert nichts.',
  'health.pickFile': 'Export.zip oder Export.xml auswählen',
  'health.importing': 'Import läuft …',
  'health.pickAnother': 'Weitere Datei importieren',
  'health.progressRead': (p: MsgParams) => `${p.percent} % gelesen · ${p.total} Zyklus-Records gefunden`,
  'health.saving': 'Speichere in die Datenbank …',
  'health.doneTitle': 'Import abgeschlossen',
  'health.noData': 'In der Datei wurden keine relevanten Zyklusdaten gefunden.',
  'health.range': (p: MsgParams) => `Zeitraum der Daten: ${p.from} bis ${p.to}`,
  'health.summary': (p: MsgParams) =>
    `${p.created} neue Tage angelegt, ${p.updated} bestehende Tage ergänzt, ${p.unchanged} Tage unverändert.`,
  'health.thType': 'Typ',
  'health.thRecords': 'Records',
  'health.thImported': 'Tage importiert',
  'health.thSkipped': 'Tage übersprungen',
  'health.skippedNote':
    'Übersprungen heißt: An diesem Tag war das Feld bereits ausgefüllt, manuelle Einträge haben Vorrang.',
  'health.mucusNote':
    'Hinweis: Die Zervixschleim-Werte aus Apple Health wurden näherungsweise auf das Sensiplan-Schema abgebildet (Dry → t, Sticky/Creamy → S, Watery/EggWhite → S+). Einzelne Tage bei Bedarf manuell prüfen.',
  'health.warningsTitle': 'Warnungen',
  'health.failed': (p: MsgParams) => `Import fehlgeschlagen: ${p.msg}`,
  'health.fieldBleeding': 'Blutung',
  'health.fieldTemp': 'Basaltemperatur',
  'health.fieldMucus': 'Zervixschleim',
  'health.fieldSpotting': 'Zwischenblutung',
  'health.fieldBreast': 'Brustspannen',

  'analyse.trends': 'Verlauf',
  'analyse.pickVariable': 'Variable wählen',
  'analyse.range': 'Zeitraum',
  'analyse.range4w': '4 Wochen',
  'analyse.range3m': '3 Monate',
  'analyse.rangeAll': 'Alles',
  'analyse.noVarData': 'Noch keine Daten für diese Variable.',

  'trends.yesDaysPerWeek': 'Ja-Tage pro Woche',
  'trends.yesDay': (p: MsgParams) => (Number(p.v) === 1 ? '1 Ja-Tag' : `${p.v} Ja-Tage`),
  'trends.countPerDay': 'Anzahl pro Tag',
  'trends.count': (p: MsgParams) => `Anzahl: ${p.v}`,
  'trends.weekOf': (p: MsgParams) => `Woche ab ${p.start}`,
  'trends.bleedSpotShort': 'Schmierbl.',

  'phase.heading': 'Phasen-Profile',
  'phase.menstruation': 'Menstruation',
  'phase.follikel': 'Follikelphase',
  'phase.luteal': 'Lutealphase',
  'phase.unbestimmt': 'Unbestimmt',
  'phase.noCyclesYet': 'Noch keine Zyklen erkannt — Phasen-Profile erscheinen, sobald eine Periode eingetragen ist.',
  'phase.noMeans':
    'Noch keine Phasen-Mittelwerte. Menstruation, Follikel- und Lutealphase lassen sich erst trennen, wenn in einem Zyklus ein Temperaturanstieg erkannt wurde — dafür die Basaltemperatur täglich morgens eintragen. Der Verlauf über den Zyklustag unten funktioniert schon jetzt.',
  'phase.noData': 'keine Daten',
  'phase.trendHeading': 'Verlauf über den Zyklus',
  'phase.noCurve': 'Noch keine Daten für den Zyklusverlauf.',
  'phase.yProportion': 'Anteil Ja-Tage',
  'phase.yMean': 'Mittelwert',
  'phase.axisNote': (p: MsgParams) => `x: Zyklustag, y: ${p.y}. Blasse Punkte: nur 1 Wert.`,
  'phase.ariaChart': (p: MsgParams) => `${p.y} von ${p.label} je Zyklustag`,
  'phase.note': (p: MsgParams) =>
    `Basiert auf ${p.n} ${Number(p.n) === 1 ? 'erkannten Zyklus' : 'erkannten Zyklen'}; Phasen erst zuordenbar, wenn ein Temperaturanstieg erkannt wurde.`,

  'corr.heading': 'Korrelationen',
  'corr.tooFewData': 'Noch zu wenig Daten — Korrelationen erscheinen ab 10 Tagen mit Einträgen.',
  'corr.howToReadTitle': 'Wie liest man das?',
  'corr.howToReadBody':
    'Ein Wert nahe +1 heißt: steigt die eine Größe, steigt meist auch die andere. Nahe −1: steigt die eine, sinkt die andere. Um 0: kein erkennbarer Zusammenhang.',
  'corr.pillPrevDay': 'Vortag',
  'corr.carryoverNote': (p: MsgParams) =>
    `Zeilen mit „Vortag" wirken erfahrungsgemäß erst am nächsten Tag — dort wird der Zeilenwert vom Vortag mit dem Spaltenwert von heute verglichen (z. B. Alkohol gestern ↔ Schlaf heute früh). Betrifft: ${p.labels}.`,
  'corr.selectHint': 'Mindestens zwei Variablen auswählen.',
  'corr.relPrevToday': 'Vortag → heute',
  'corr.relSameDay': 'gleicher Tag',
  'corr.rhoVal': (p: MsgParams) => `ρ = ${p.r}, n = ${p.n}`,
  'corr.rhoNA': (p: MsgParams) => `ρ nicht berechenbar, n = ${p.n}`,
  'corr.sentPrev': (p: MsgParams) =>
    `War „${p.row}" am Vortag Richtung „${p.rowHigh}", war „${p.col}" eher „${p.colWord}".`,
  'corr.sentSame': (p: MsgParams) =>
    `An Tagen mit „${p.row}" Richtung „${p.rowHigh}" war „${p.col}" eher „${p.colWord}".`,
  'corr.legendLow': '−1 gegenläufig',
  'corr.legendHigh': '+1 gleichläufig',
  'corr.footnote':
    'Spearman-Rangkorrelation. Zellen mit n < 20 sind ausgegraut. Bei vielen Zellen sind einzelne „starke" Werte durch Zufall zu erwarten — Hypothesen, keine Beweise.',
  'corr.cellAria': (p: MsgParams) => `Korrelation ${p.a} und ${p.b}`,

  'cyclevar.temperatur': 'Basaltemperatur',
  'cyclevar.blutung': 'Blutungsstärke',
  'cyclevar.schleim': 'Zervixschleim-Qualität',
  'cyclevar.zyklustag': 'Zyklustag',
  'cyclevar.lutealphase': 'Lutealphase (ja/nein)',

  'impl.cardTitle': (p: MsgParams) =>
    Number(p.n) === 1
      ? 'Auffälligkeit gefunden: 1 sehr eindeutiges Muster'
      : `Auffälligkeiten gefunden: ${p.n} sehr eindeutige Muster`,
  'impl.intro':
    'Hier erscheinen automatisch geprüfte, sehr eindeutige Muster aus deinen Daten: einseitige Implikationen (⇒) wie „krank ⇒ kein Sport", bei denen die Umkehrung nicht gilt, und beidseitige Korrelationen (↔), bei denen zwei Größen durchgängig zusammen steigen oder fallen. Anders als in der Korrelationsmatrix unten musst du nichts auswählen — geprüft werden alle Paare.',
  'impl.forward': (p: MsgParams) =>
    `An ${p.nA} Tagen galt „${p.a}" — an ${p.nAB} davon (${p.pct} %) auch „${p.b}".`,
  'impl.reverse': (p: MsgParams) =>
    `Umgekehrt nicht: Von ${p.nB} Tagen mit „${p.b}" hatten nur ${p.nAB} (${p.pct} %) auch „${p.a}".`,
  'impl.baseline': (p: MsgParams) =>
    `Zum Vergleich: An Tagen ohne „${p.a}" kam „${p.b}" nur in ${p.pct} % vor.`,
  'impl.footnote': (p: MsgParams) =>
    `Kriterien einseitig (⇒): Bedingung mindestens ${p.minDays}-mal aufgetreten, Folge in mindestens ${p.conf} % der Fälle und deutlich über der Basisrate (einseitiger exakter Fisher-Test mit Bonferroni-Korrektur), Gegenrichtung höchstens ${p.rev} %; verglichen wird derselbe Tag. Kriterien beidseitig (↔): Spearman |ρ| ≥ ${String(p.rho).replace('.', ',')} bei mindestens ${p.corrDays} gemeinsamen Tagen und Signifikanz nach Bonferroni-Korrektur; „Vortag" paart wie in der Matrix den Vortag mit dem Folgetag. Bei Ja/Nein- und Auswahl-Habits zählt ein erfasster Tag ohne Angabe als „nein". Zusammenhang heißt nicht Ursache.`,

  'pred.title': 'Nächste Periode',
  'pred.exact': 'genau',
  'pred.overdue': (p: MsgParams) => `überfällig seit ${p.n} ${Number(p.n) === 1 ? 'Tag' : 'Tagen'}`,
  'pred.today': 'wahrscheinlich heute',
  'pred.before': (p: MsgParams) => `wahrscheinlich vor ${p.n} ${Number(p.n) === 1 ? 'Tag' : 'Tagen'}`,
  'pred.inDays': (p: MsgParams) => `in ${p.n} ${Number(p.n) === 1 ? 'Tag' : 'Tagen'}`,
  'pred.window': (p: MsgParams) => `Zeitfenster ${p.from} – ${p.to}`,
  'pred.basisTempDefault':
    'Nach dem Temperaturanstieg, mit Standard-Lutealphase (14 Tage) — wird genauer, sobald du eigene Temperatur-Zyklen gesammelt hast.',
  'pred.basisTempOwn': (p: MsgParams) =>
    `Nach dem bestätigten Temperaturanstieg, über deine eigene Lutealphase (aus ${p.n} Zyklen). Das ist die genaueste Schätzung.`,
  'pred.basisLength': (p: MsgParams) => `Aus der Verteilung deiner ${p.n} bisherigen Zykluslängen.`,
  'pred.basisLengthHint': ' Sie verengt sich, sobald in diesem Zyklus ein Temperaturanstieg erkannt wird.',
  'pred.reasonNoCycle': 'Noch kein Zyklus erkannt.',
  'pred.reasonNeedCycles': (p: MsgParams) =>
    `Für eine Vorhersage braucht es mindestens ${p.min} abgeschlossene Zyklen (aktuell ${p.current}).`,

  'zyklus.heading': 'Zyklus',
  'zyklus.emptyTitle': 'Noch kein Zyklus erkannt.',
  'zyklus.emptyBody':
    'Ein Zyklus beginnt mit dem ersten Tag echter Blutung. Trage dazu im Tagesformular die Blutungsstärke leicht, mittel oder stark ein — Schmierblutung allein zählt nicht als Zyklusbeginn. Danach erscheint hier das Kurvenblatt mit Temperaturkurve, Schleim- und Blutungssymbolen.',
  'zyklus.prevCycle': 'Voriger Zyklus',
  'zyklus.nextCycle': 'Nächster Zyklus',
  'zyklus.cycleFrom': (p: MsgParams) => `Zyklus ab ${p.date} (${p.len} ${Number(p.len) === 1 ? 'Tag' : 'Tage'})`,
  'zyklus.cycleFromDay': (p: MsgParams) => `Zyklus ab ${p.date} (Tag ${p.day})`,
  'zyklus.history': 'Zyklushistorie',
  'zyklus.statsLine': (p: MsgParams) =>
    `n=${p.n} ${Number(p.n) === 1 ? 'Zyklus' : 'Zyklen'} · Median ${p.median} · Spannweite ${p.min}–${p.max} Tage`,
  'zyklus.noCompletedCycle':
    'Noch kein abgeschlossener Zyklus — die Längen-Statistik folgt mit dem nächsten Zyklusbeginn.',
  'zyklus.cyclesCount': (p: MsgParams) => `${p.n} ${Number(p.n) === 1 ? 'Zyklus' : 'Zyklen'}`,
  'zyklus.running': (p: MsgParams) => `läuft (Tag ${p.day})`,
  'zyklus.lenDays': (p: MsgParams) => `${p.len} ${Number(p.len) === 1 ? 'Tag' : 'Tage'}`,
  'zyklus.ovDay': (p: MsgParams) => `ES ≈ Tag ${p.day}`,
  'zyklus.dash': '—',

  'chart.axisDay': 'Tag',
  'chart.axisMucus': 'Schleim',
  'chart.noTemps': 'Noch keine Temperaturwerte in diesem Zyklus',
  'chart.coverline': (p: MsgParams) => `Hilfslinie ${p.temp} °C`,
  'chart.ovulation': (p: MsgParams) => `Eisprung ≈ Tag ${p.day}`,
  'chart.mucusPeak': 'Schleimhöhepunkt',
  'chart.dayAria': (p: MsgParams) => `Tag ${p.day}: Details anzeigen`,
  'chart.legendTemp': 'Temperatur',
  'chart.legendExcluded': 'ausgeklammert',
  'chart.legendDisturbed': 'gestörte Messung',
  'chart.legendFirstHigh': '1. höhere Messung / Bestätigung',
  'chart.legendBleeding': 'Blutung (Größe = Stärke)',
  'chart.legendHint': 'Tag antippen für Details',

  'day.aria': 'Tagesdetails',
  'day.cycleDay': (p: MsgParams) => `Zyklustag ${p.day}`,
  'day.tempLine': (p: MsgParams) => `${p.temp} °C um ${p.time} Uhr`,
  'day.disturbedTag': 'gestört',
  'day.disturbNote': (p: MsgParams) => `Störung: ${p.note}`,
  'day.noData': 'Keine Zyklusdaten für diesen Tag.',

  'rule.titleTooFew': 'Zu wenige Temperaturwerte',
  'rule.bodyTooFew':
    'Für die Auswertung braucht es mindestens 6 Messungen als Vergleichsbasis plus eine erste höhere Messung. Am besten täglich direkt nach dem Aufwachen messen — ausgeklammerte Werte zählen dabei nicht mit.',
  'rule.titleNoShift': 'Noch kein Temperaturanstieg erkennbar',
  'rule.bodyNoShift':
    'Gesucht wird eine Messung über allen 6 vorangehenden Werten, gefolgt von 2 weiteren höheren Messungen; die dritte muss mindestens 0,2 °C über der Hilfslinie liegen (3-über-6-Regel). Sobald das eintritt, erscheint die Auswertung hier.',
  'rule.titleStandard': 'Temperaturanstieg bestätigt: 3-über-6-Regel',
  'rule.titleAusnahme1': 'Temperaturanstieg bestätigt: Ausnahmeregel 1 (4. Wert)',
  'rule.titleAusnahme2': 'Temperaturanstieg bestätigt: Ausnahmeregel 2 (Ausreißer ausgeklammert)',
  'rule.bodyStandard': (p: MsgParams) =>
    `3 Messungen liegen über der Hilfslinie (${p.cover} — das Maximum der 6 vorangehenden Werte), die dritte mindestens 0,2 °C darüber.`,
  'rule.bodyAusnahme1': (p: MsgParams) =>
    `Die dritte höhere Messung lag keine 0,2 °C über der Hilfslinie (${p.cover}). Nach Ausnahmeregel 1 wurde deshalb ein 4. Wert abgewartet — er muss nur über der Hilfslinie liegen.`,
  'rule.bodyAusnahme2': (p: MsgParams) =>
    `Eine der 3 höheren Messungen fiel auf oder unter die Hilfslinie (${p.cover}) und wurde ausgeklammert${p.bracketDay ? ` (Tag ${p.bracketDay})` : ''}. Nach Ausnahmeregel 2 muss dafür die 4. Messung mindestens 0,2 °C über der Hilfslinie liegen.`,
  'rule.bodyFirstHigh': (p: MsgParams) =>
    `Erste höhere Messung: Tag ${p.fhDay} (${p.date}), bestätigt an Tag ${p.confDay}. Der Eisprung liegt meist am Tag vor der ersten höheren Messung — geschätzt Tag ${p.ovDay}.`,
  'rule.bodyMucusMismatch': (p: MsgParams) =>
    `Hinweis: Der Schleimhöhepunkt (Tag ${p.mp}) liegt mehr als 3 Tage von der Eisprung-Schätzung entfernt. Temperatur- und Schleimbild passen nicht gut zusammen — Schätzung mit Vorsicht interpretieren.`,
  'rule.bodyMucusMatch': (p: MsgParams) =>
    `Der Schleimhöhepunkt (Tag ${p.mp}) passt zeitlich zur Temperaturauswertung und stützt die Schätzung.`
} satisfies Record<string, Msg>;

export type MessageKey = keyof typeof de;

const en: Record<MessageKey, Msg> = {
  'nav.heute': 'Today',
  'nav.monat': 'Month',
  'nav.zyklus': 'Cycle',
  'nav.analyse': 'Analysis',
  'nav.mehr': 'More',

  'common.back': 'Back',
  'common.close': 'Close',
  'common.done': 'Done',
  'common.cancel': 'Cancel',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.noEntry': 'No entry',
  'common.more': 'more',
  'common.less': 'less',

  'heute.prevDay': 'Previous day',
  'heute.nextDay': 'Next day',
  'heute.pickDate': 'Choose date',
  'heute.backToToday': 'Back to today',
  'heute.backupOverdue': 'Last backup was over 14 days ago',
  'heute.toBackup': 'To backup',
  'heute.saveFailed': 'Save failed — the last change was not stored.',

  'habits.heading': 'Habits',

  'cycle.heading': 'Cycle',
  'cycle.bleeding': 'Bleeding',
  'cycle.bleedingNone': 'none',
  'cycle.basalTemp': 'Basal temperature',
  'cycle.disturbSuggest': (p: MsgParams) =>
    `Yesterday: ${p.reasons} — mark measurement as disturbed?`,
  'cycle.markDisturbed': 'Mark as disturbed',
  'cycle.tempAria': 'Basal temperature in °C',
  'cycle.measureTime': 'Measurement time',
  'cycle.tempOutOfRange': 'Value outside 34–42 °C — not saved.',
  'cycle.disturbed': 'Measurement disturbed',
  'cycle.reasonOptional': 'Reason (optional)',
  'cycle.exclude': 'Exclude value',
  'cycle.excludedHint': 'Skipped in the later analysis.',
  'cycle.mucus': 'Cervical mucus',
  'cycle.extras': 'Additional signs',
  'cycle.note': 'Note',
  'cycle.notePlaceholder': 'Note for the day',
  'cycle.tempPlaceholder': '36.50',

  'bleeding.spotting': 'Spotting',
  'bleeding.light': 'light',
  'bleeding.medium': 'medium',
  'bleeding.heavy': 'heavy',

  'mucus.t': 'dry: dry, rough feeling, nothing visible',
  'mucus.none': 'nothing felt, nothing seen',
  'mucus.f': 'moist: moist feeling, but no mucus visible',
  'mucus.S': 'lower-quality mucus: thick, whitish, creamy, lumpy',
  'mucus.Splus': 'best quality: clear, spinnable, stretchy; wet/slippery feeling',

  'sign.midPain': 'Mid-cycle pain',
  'sign.breastTenderness': 'Breast tenderness',
  'sign.spotting': 'Breakthrough bleeding',

  'monat.prevMonth': 'Previous month',
  'monat.nextMonth': 'Next month',
  'monat.period': 'Period',
  'monat.editPeriod': (p: MsgParams) => `Edit period on day ${p.n}`,
  'monat.editHabit': (p: MsgParams) => `Edit ${p.name} on day ${p.n}`,
  'monat.openDay': (p: MsgParams) => `Open day ${p.n} in the daily form`,
  'monat.saveFailed': 'Save failed — the change was not stored.',
  'legend.yes': 'Yes',
  'legend.noRecorded': 'No (recorded)',
  'legend.scale': 'Scale: 1 bad → 4 ideal',
  'legend.periodRange': 'Period light–heavy',
  'legend.spotting': 'Spotting / breakthrough bleeding',
  'legend.gap': 'Day without entry',
  'legend.empty': 'Empty cell: no entry',

  'mehr.heading': 'More',
  'mehr.language': 'Language',
  'mehr.habitsLabel': 'Manage habits',
  'mehr.habitsHint': 'Create, rename, archive',
  'mehr.healthLabel': 'Apple Health import',
  'mehr.healthHint': 'One-time import of old data',
  'mehr.backupLabel': 'Backup & export',
  'mehr.backupHint': 'JSON backup, CSV for analysis',

  'habitcfg.heading': 'Manage habits',
  'habitcfg.moveAria': 'Move',
  'habitcfg.newHabit': 'Create new habit',
  'habitcfg.newHabitTitle': 'New habit',
  'habitcfg.archivedToggle': (p: MsgParams) => `Archived habits (${p.n})`,
  'habitcfg.archivedHint':
    'Archived habits disappear from Today/Month; their data is kept for analysis.',
  'habitcfg.reactivate': 'Reactivate',
  'badge.bool': 'Yes/No',
  'badge.scale4': 'Scale 1–4',
  'badge.choice': 'Choice',

  'habiteditor.name': 'Name',
  'habiteditor.scaleLabels': 'Scale labels',
  'habiteditor.options': 'Options',
  'habiteditor.optionsHint': 'Old day entries keep removed options.',
  'habiteditor.save': 'Save',
  'habiteditor.archive': 'Archive',
  'habiteditor.archiveHint':
    'Archived habits disappear from Today/Month; their data is kept for analysis.',
  'habiteditor.delete': 'Delete',
  'habiteditor.deleteConfirm': 'Delete permanently? All recorded values for this habit will be lost.',
  'habiteditor.deleteConfirmBtn': 'Delete permanently',
  'habiteditor.errNameEmpty': 'Name must not be empty.',
  'habiteditor.errScaleLabels': 'Fill in all four scale labels.',
  'habiteditor.errOptions': 'Provide at least one option.',
  'habiteditor.deleteFailed': 'Delete failed — please try again.',

  'newhabit.namePlaceholder': 'e.g. Meditation',
  'newhabit.type': 'Type',
  'newhabit.typeAria': 'Choose type',
  'newhabit.typeHint': 'Type cannot be changed after creation.',
  'newhabit.create': 'Create',

  'choices.placeholder': 'Option',
  'choices.remove': 'Remove',
  'choices.add': 'Add option',

  'backup.title': 'Backup & export',
  'backup.createTitle': 'Create backup',
  'backup.createHint':
    'Complete JSON backup of all data (day entries, habits, cycles, settings). On the iPhone, save it via the share sheet to iCloud Drive or "Files".',
  'backup.lastLabel': 'Last backup:',
  'backup.never': 'never',
  'backup.exportBtn': 'Export backup',
  'backup.exported': 'Backup exported.',
  'backup.exportAborted': 'Export cancelled.',
  'backup.exportFailed': (p: MsgParams) => `Export failed: ${p.err}`,
  'backup.restoreTitle': 'Restore backup',
  'backup.restoreHint': 'Fully restores a previously exported JSON backup.',
  'backup.jsonReadError': 'File could not be read as JSON.',
  'backup.summaryExportedAt': (p: MsgParams) => `Exported on: ${p.ts}`,
  'backup.summaryEntries': 'Day entries',
  'backup.summaryRange': (p: MsgParams) => `(${p.from} to ${p.to})`,
  'backup.summaryHabits': 'Habits',
  'backup.summaryCycles': 'Cycles',
  'backup.summarySettings': 'Settings',
  'backup.restoreBtn': 'Restore …',
  'backup.restoreWarn': 'Replaces ALL existing data in the app. This cannot be undone.',
  'backup.restoreConfirm': 'Yes, replace all data',
  'backup.restored': (p: MsgParams) => `Backup restored: ${p.entries} day entries, ${p.habits} habits.`,
  'backup.restoreFailed': (p: MsgParams) => `Restore failed: ${p.err}`,
  'backup.csvTitle': 'CSV export',
  'backup.csvHint':
    'For analysis in Jupyter/Pandas: one row per day, one column per habit plus cycle data. Contains no settings and does not replace a backup.',
  'backup.csvBtn': 'Export CSV',
  'backup.csvExported': (p: MsgParams) => `CSV exported (${p.n} days).`,

  'health.title': 'Apple Health import',
  'health.intro':
    'How to get the export: in the Health app on the iPhone, tap the profile picture at the top right and choose "Export All Health Data". Select the resulting Export.zip here (e.g. via the Files app); an already-unpacked Export.xml works too.',
  'health.introFields':
    'Imported are bleeding, basal temperature, cervical mucus, breakthrough bleeding and breast tenderness. Period entries without an intensity are taken as "light". Manually entered values are never overwritten; re-importing the same file changes nothing.',
  'health.pickFile': 'Select Export.zip or Export.xml',
  'health.importing': 'Import running …',
  'health.pickAnother': 'Import another file',
  'health.progressRead': (p: MsgParams) => `${p.percent} % read · ${p.total} cycle records found`,
  'health.saving': 'Saving to the database …',
  'health.doneTitle': 'Import complete',
  'health.noData': 'No relevant cycle data was found in the file.',
  'health.range': (p: MsgParams) => `Data range: ${p.from} to ${p.to}`,
  'health.summary': (p: MsgParams) =>
    `${p.created} new days created, ${p.updated} existing days extended, ${p.unchanged} days unchanged.`,
  'health.thType': 'Type',
  'health.thRecords': 'Records',
  'health.thImported': 'Days imported',
  'health.thSkipped': 'Days skipped',
  'health.skippedNote':
    'Skipped means: the field was already filled on that day; manual entries take precedence.',
  'health.mucusNote':
    'Note: the cervical mucus values from Apple Health were approximately mapped to the Sensiplan scheme (Dry → t, Sticky/Creamy → S, Watery/EggWhite → S+). Check individual days manually if needed.',
  'health.warningsTitle': 'Warnings',
  'health.failed': (p: MsgParams) => `Import failed: ${p.msg}`,
  'health.fieldBleeding': 'Bleeding',
  'health.fieldTemp': 'Basal temperature',
  'health.fieldMucus': 'Cervical mucus',
  'health.fieldSpotting': 'Breakthrough bleeding',
  'health.fieldBreast': 'Breast tenderness',

  'analyse.trends': 'Trends',
  'analyse.pickVariable': 'Choose variable',
  'analyse.range': 'Time range',
  'analyse.range4w': '4 weeks',
  'analyse.range3m': '3 months',
  'analyse.rangeAll': 'All',
  'analyse.noVarData': 'No data for this variable yet.',

  'trends.yesDaysPerWeek': 'Yes-days per week',
  'trends.yesDay': (p: MsgParams) => (Number(p.v) === 1 ? '1 yes-day' : `${p.v} yes-days`),
  'trends.countPerDay': 'Count per day',
  'trends.count': (p: MsgParams) => `Count: ${p.v}`,
  'trends.weekOf': (p: MsgParams) => `Week of ${p.start}`,
  'trends.bleedSpotShort': 'Spotting',

  'phase.heading': 'Phase profiles',
  'phase.menstruation': 'Menstruation',
  'phase.follikel': 'Follicular phase',
  'phase.luteal': 'Luteal phase',
  'phase.unbestimmt': 'Undetermined',
  'phase.noCyclesYet': 'No cycles detected yet — phase profiles appear once a period is entered.',
  'phase.noMeans':
    'No phase means yet. Menstruation, follicular and luteal phase can only be separated once a temperature shift has been detected in a cycle — for that, enter the basal temperature every morning. The trend across the cycle day below already works now.',
  'phase.noData': 'no data',
  'phase.trendHeading': 'Trend across the cycle',
  'phase.noCurve': 'No data for the cycle trend yet.',
  'phase.yProportion': 'Share of yes-days',
  'phase.yMean': 'Mean',
  'phase.axisNote': (p: MsgParams) => `x: cycle day, y: ${p.y}. Faint points: only 1 value.`,
  'phase.ariaChart': (p: MsgParams) => `${p.y} of ${p.label} per cycle day`,
  'phase.note': (p: MsgParams) =>
    `Based on ${p.n} detected ${Number(p.n) === 1 ? 'cycle' : 'cycles'}; phases only assignable once a temperature shift has been detected.`,

  'corr.heading': 'Correlations',
  'corr.tooFewData': 'Not enough data yet — correlations appear from 10 days with entries.',
  'corr.howToReadTitle': 'How to read this?',
  'corr.howToReadBody':
    'A value near +1 means: as one quantity rises, the other usually rises too. Near −1: as one rises, the other falls. Around 0: no discernible relationship.',
  'corr.pillPrevDay': 'Prev. day',
  'corr.carryoverNote': (p: MsgParams) =>
    `Rows marked "Prev. day" typically take effect the next day — there the row value from the previous day is compared with the column value of today (e.g. alcohol yesterday ↔ sleep this morning). Applies to: ${p.labels}.`,
  'corr.selectHint': 'Select at least two variables.',
  'corr.relPrevToday': 'prev day → today',
  'corr.relSameDay': 'same day',
  'corr.rhoVal': (p: MsgParams) => `ρ = ${p.r}, n = ${p.n}`,
  'corr.rhoNA': (p: MsgParams) => `ρ not computable, n = ${p.n}`,
  'corr.sentPrev': (p: MsgParams) =>
    `When "${p.row}" was toward "${p.rowHigh}" the previous day, "${p.col}" tended to be "${p.colWord}".`,
  'corr.sentSame': (p: MsgParams) =>
    `On days with "${p.row}" toward "${p.rowHigh}", "${p.col}" tended to be "${p.colWord}".`,
  'corr.legendLow': '−1 opposite',
  'corr.legendHigh': '+1 same direction',
  'corr.footnote':
    'Spearman rank correlation. Cells with n < 20 are greyed out. With many cells, individual "strong" values are expected by chance — hypotheses, not proof.',
  'corr.cellAria': (p: MsgParams) => `Correlation ${p.a} and ${p.b}`,

  'cyclevar.temperatur': 'Basal temperature',
  'cyclevar.blutung': 'Bleeding intensity',
  'cyclevar.schleim': 'Cervical mucus quality',
  'cyclevar.zyklustag': 'Cycle day',
  'cyclevar.lutealphase': 'Luteal phase (yes/no)',

  'impl.cardTitle': (p: MsgParams) =>
    Number(p.n) === 1
      ? 'Pattern found: 1 very clear pattern'
      : `Patterns found: ${p.n} very clear patterns`,
  'impl.intro':
    'Automatically checked, very clear patterns from your data: one-directional implications (⇒) like "sick ⇒ no exercise", where the reverse does not hold, and two-sided correlations (↔), where two quantities consistently rise or fall together. Unlike the correlation matrix below, nothing needs to be selected — all pairs are checked.',
  'impl.forward': (p: MsgParams) =>
    `"${p.a}" held on ${p.nA} days — on ${p.nAB} of them (${p.pct} %) "${p.b}" held too.`,
  'impl.reverse': (p: MsgParams) =>
    `Not the other way round: of ${p.nB} days with "${p.b}", only ${p.nAB} (${p.pct} %) also had "${p.a}".`,
  'impl.baseline': (p: MsgParams) =>
    `For comparison: on days without "${p.a}", "${p.b}" occurred only ${p.pct} % of the time.`,
  'impl.footnote': (p: MsgParams) =>
    `One-directional criteria (⇒): condition occurred at least ${p.minDays} times, consequence in at least ${p.conf} % of cases and clearly above the base rate (one-sided exact Fisher test with Bonferroni correction), reverse direction at most ${p.rev} %; compared on the same day. Two-sided criteria (↔): Spearman |ρ| ≥ ${p.rho} over at least ${p.corrDays} shared days and significance after Bonferroni correction; "Prev. day" pairs the previous day with the following day, as in the matrix. For yes/no and choice habits, a tracked day without a mark counts as "no". Correlation is not causation.`,

  'pred.title': 'Next period',
  'pred.exact': 'precise',
  'pred.overdue': (p: MsgParams) => `overdue by ${p.n} ${Number(p.n) === 1 ? 'day' : 'days'}`,
  'pred.today': 'likely today',
  'pred.before': (p: MsgParams) => `likely ${p.n} ${Number(p.n) === 1 ? 'day' : 'days'} ago`,
  'pred.inDays': (p: MsgParams) => `in ${p.n} ${Number(p.n) === 1 ? 'day' : 'days'}`,
  'pred.window': (p: MsgParams) => `Window ${p.from} – ${p.to}`,
  'pred.basisTempDefault':
    'After the temperature shift, with a default luteal phase (14 days) — this gets more precise once you have collected your own temperature cycles.',
  'pred.basisTempOwn': (p: MsgParams) =>
    `After the confirmed temperature shift, using your own luteal phase (from ${p.n} cycles). This is the most precise estimate.`,
  'pred.basisLength': (p: MsgParams) => `From the distribution of your ${p.n} previous cycle lengths.`,
  'pred.basisLengthHint': ' It narrows as soon as a temperature shift is detected in this cycle.',
  'pred.reasonNoCycle': 'No cycle detected yet.',
  'pred.reasonNeedCycles': (p: MsgParams) =>
    `A prediction needs at least ${p.min} completed cycles (currently ${p.current}).`,

  'zyklus.heading': 'Cycle',
  'zyklus.emptyTitle': 'No cycle detected yet.',
  'zyklus.emptyBody':
    'A cycle begins on the first day of real bleeding. In the daily form, enter the bleeding intensity light, medium or heavy — spotting alone does not count as a cycle start. After that, the chart with temperature curve, mucus and bleeding symbols appears here.',
  'zyklus.prevCycle': 'Previous cycle',
  'zyklus.nextCycle': 'Next cycle',
  'zyklus.cycleFrom': (p: MsgParams) => `Cycle from ${p.date} (${p.len} ${Number(p.len) === 1 ? 'day' : 'days'})`,
  'zyklus.cycleFromDay': (p: MsgParams) => `Cycle from ${p.date} (day ${p.day})`,
  'zyklus.history': 'Cycle history',
  'zyklus.statsLine': (p: MsgParams) =>
    `n=${p.n} ${Number(p.n) === 1 ? 'cycle' : 'cycles'} · median ${p.median} · range ${p.min}–${p.max} days`,
  'zyklus.noCompletedCycle':
    'No completed cycle yet — the length statistics follow with the next cycle start.',
  'zyklus.cyclesCount': (p: MsgParams) => `${p.n} ${Number(p.n) === 1 ? 'cycle' : 'cycles'}`,
  'zyklus.running': (p: MsgParams) => `ongoing (day ${p.day})`,
  'zyklus.lenDays': (p: MsgParams) => `${p.len} ${Number(p.len) === 1 ? 'day' : 'days'}`,
  'zyklus.ovDay': (p: MsgParams) => `Ov ≈ day ${p.day}`,
  'zyklus.dash': '—',

  'chart.axisDay': 'Day',
  'chart.axisMucus': 'Mucus',
  'chart.noTemps': 'No temperature values in this cycle yet',
  'chart.coverline': (p: MsgParams) => `Cover line ${p.temp} °C`,
  'chart.ovulation': (p: MsgParams) => `Ovulation ≈ day ${p.day}`,
  'chart.mucusPeak': 'Mucus peak',
  'chart.dayAria': (p: MsgParams) => `Day ${p.day}: show details`,
  'chart.legendTemp': 'Temperature',
  'chart.legendExcluded': 'excluded',
  'chart.legendDisturbed': 'disturbed measurement',
  'chart.legendFirstHigh': '1st higher measurement / confirmation',
  'chart.legendBleeding': 'Bleeding (size = intensity)',
  'chart.legendHint': 'Tap a day for details',

  'day.aria': 'Day details',
  'day.cycleDay': (p: MsgParams) => `Cycle day ${p.day}`,
  'day.tempLine': (p: MsgParams) => `${p.temp} °C at ${p.time}`,
  'day.disturbedTag': 'disturbed',
  'day.disturbNote': (p: MsgParams) => `Disturbance: ${p.note}`,
  'day.noData': 'No cycle data for this day.',

  'rule.titleTooFew': 'Too few temperature values',
  'rule.bodyTooFew':
    'The analysis needs at least 6 measurements as a baseline plus a first higher measurement. Best to measure daily right after waking — excluded values do not count.',
  'rule.titleNoShift': 'No temperature shift detectable yet',
  'rule.bodyNoShift':
    'It looks for a measurement above all 6 preceding values, followed by 2 more higher measurements; the third must be at least 0.2 °C above the cover line (three-over-six rule). As soon as that happens, the analysis appears here.',
  'rule.titleStandard': 'Temperature shift confirmed: three-over-six rule',
  'rule.titleAusnahme1': 'Temperature shift confirmed: exception rule 1 (4th value)',
  'rule.titleAusnahme2': 'Temperature shift confirmed: exception rule 2 (outlier excluded)',
  'rule.bodyStandard': (p: MsgParams) =>
    `3 measurements are above the cover line (${p.cover} — the maximum of the 6 preceding values), the third at least 0.2 °C above it.`,
  'rule.bodyAusnahme1': (p: MsgParams) =>
    `The third higher measurement was not 0.2 °C above the cover line (${p.cover}). Under exception rule 1, a 4th value was therefore awaited — it only needs to be above the cover line.`,
  'rule.bodyAusnahme2': (p: MsgParams) =>
    `One of the 3 higher measurements fell on or below the cover line (${p.cover}) and was excluded${p.bracketDay ? ` (day ${p.bracketDay})` : ''}. Under exception rule 2, the 4th measurement must therefore be at least 0.2 °C above the cover line.`,
  'rule.bodyFirstHigh': (p: MsgParams) =>
    `First higher measurement: day ${p.fhDay} (${p.date}), confirmed on day ${p.confDay}. Ovulation is usually the day before the first higher measurement — estimated day ${p.ovDay}.`,
  'rule.bodyMucusMismatch': (p: MsgParams) =>
    `Note: the mucus peak (day ${p.mp}) is more than 3 days from the ovulation estimate. Temperature and mucus picture do not match well — interpret the estimate with caution.`,
  'rule.bodyMucusMatch': (p: MsgParams) =>
    `The mucus peak (day ${p.mp}) fits the temperature analysis in time and supports the estimate.`
};

export const messages: Record<Lang, Record<MessageKey, Msg>> = { de, en };
