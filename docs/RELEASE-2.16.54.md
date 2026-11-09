# PodCore v2.16.54 – kürzere Arbeitswege und ruhigeres UI

Die Navigation ist nach Aufgaben gruppiert, der Episoden-Editor räumt seltene Optionen aus dem täglichen Arbeitsbereich und die Media Library öffnet eine vereinfachte Audio-Arbeitsansicht. Bestehende Daten, Rollen, optionale Module und die erweiterten Audio-/DAW-Werkzeuge bleiben erhalten. Es gibt keine neue Datenbankmigration und keine neue Cloud-, KI- oder PipeWire-Abhängigkeit.

## Schnell zurechtfinden

Die Seitenleiste enthält Arbeitsplatz, Planung & Archiv, Sponsoring, Auswertungen sowie Einrichtung & Hilfe. Eine Gruppe lässt sich mit ihrer Überschrift öffnen oder schließen. Die Menüsuche durchsucht alle für die Rolle zugänglichen Einträge, auch geschlossene Gruppen. Strg+K auf Windows/Linux oder ⌘+K auf macOS fokussiert die Suche. Nach Auswahl eines Treffers wird das Suchfeld geleert und die passende Gruppe geöffnet. Auf kleinen Displays schließt die Auswahl das mobile Menü.

Die Sidebar wird bei Layout-Updates nicht mehr als neuer React-Komponententyp eingehängt. Dadurch bleiben Suchfokus und Scrollcontainer bestehen. Die aktuelle Seite ist eindeutig gekennzeichnet. Tutorial-Zielattribute bleiben erhalten; bei einer aktiven Tutorialmarkierung wird die passende Navigationsgruppe geöffnet.

## Episode erstellen und weiterarbeiten

Unter Episoden genügt zunächst ein Titel. „Weitere Angaben“ zeigt Nummer, Startstatus und Beschreibung. Standard ist Entwurf. „Entwurf anlegen & Skript öffnen“ führt direkt in den Editor. Eine optionale Episodennummer muss eine ganze Zahl ab 1 sein. Doppelte Absendeaktionen sind während der Erstellung gesperrt; ein Fehler verwirft die Eingaben nicht.

Suche und Status werden gemeinsam mit Enter oder „Suchen & filtern“ angewendet. Ein Hinweis zeigt noch nicht angewendete Filteränderungen. „Zurücksetzen“ stellt die Gesamtansicht wieder her. Keine Treffer, noch keine Episoden und Ladefehler sind unterschiedliche Zustände mit passenden Folgeaktionen. Es werden weiterhin höchstens 50 Episoden pro Listenaufruf angezeigt; bei mehr Ergebnissen weist die Liste auf die Eingrenzung durch Filter hin.

Jede Episode bietet einen direkten Skript-Link und „Ablauf prüfen“ zur Abnahme. Die Editor-Tabs sind Grunddaten, Recherche & Ideen, Skript, Produktion, Technik, Werbung, Show-Notes und Abnahme & Check. Optionale Recherche-/Werbebereiche richten sich nach Modulen und Berechtigungen. Ein Tab ist über die URL direkt ladbar, beispielsweise `?tab=script`, `?tab=production` oder `?tab=workflow`.

## Schreiben, Speichern und Export

„Fokusmodus“ blendet die rechte Informationsspalte aus und vergrößert den Schreibbereich. Der Text bleibt unverändert. „Normalansicht“ zeigt Kommentare, Verlauf und Zusammenfassung wieder. Große Bildschirme halten die Aktionsleiste beim Scrollen oben erreichbar; auf kleinen Displays bleibt sie im normalen Inhaltsfluss, damit sie nicht den Arbeitsbereich verdeckt.

„Block hinzufügen“ bündelt alle bisherigen Abschnittstypen in einer Auswahl. Die Reihenfolge wird am Block mit Auf/Ab geändert. Die laufende Nummer ersetzt einen Griff, der zuvor Drag-and-drop suggerierte. Ohne Blöcke ist „Intro hinzufügen“ die direkte Erstaktion. Vorlagen, Interviewfragen und Medienzuordnungen bleiben verfügbar.

Strg+S beziehungsweise ⌘+S speichert die gesamte Episode. Grunddaten besitzen weiterhin eine zusätzliche feldweise automatische Speicherung. Ein erfolgreiches Metadaten-Autosave markiert offene Skriptänderungen nicht als vollständig gespeichert. Änderungen, die während einer Gesamtspeicherung eingegeben werden, bleiben als offen gekennzeichnet. Vor dem Verlassen über einen Seitenlink oder dem Schließen/Neuladen des Browserfensters wird bei offenen Episodenänderungen gewarnt. Diese Schutzmaßnahme ist keine automatische Hintergrundsicherung; vor dem Wechsel sollten Änderungen bewusst gespeichert werden.

„PDF exportieren“ öffnet Dokumenttitel, Dateiname, Layout und Optionen für klassisches Layout oder Notizseite erst bei Bedarf. Sind Episodenänderungen offen, wird vor dem PDF gespeichert. Bei einem Speicherfehler wird der Export abgebrochen, statt einen veralteten Serverstand auszuliefern. Der Editor bleibt zum Korrigieren und erneuten Speichern offen.

## Audio-Arbeitsansicht

In der Media Library unter Audio-Editor eine Audiodatei wählen. Die Standardansicht gliedert die Arbeit in Anhören, Marken/Kommentare setzen und Schnittliste exportieren. Die Audiodatei wird dabei nicht verändert. Marken und Kommentare werden beim Hinzufügen direkt gespeichert. Zeitpunkte außerhalb der Audiodauer sind gesperrt. Fehler und Wiederholungsaktionen sind sichtbar; nach einer fehlgeschlagenen Datenladung sind Gesamtspeichern und Export gesperrt, damit keine unvollständige Liste verwendet wird.

Marken erscheinen chronologisch. Die Suche nach Bezeichnung/Person und der Typfilter begrenzen nur die Anzeige. PDF-Schnittliste, Audition-Marker als CSV und JSON-Schnittplan enthalten weiterhin alle Einträge. Timecodes springen an eine Stelle, ohne automatisch abzuspielen. Außerhalb von Feldern und Schaltflächen stehen Leertaste, Pfeile sowie M/C als Zusatzshortcuts zur Verfügung. Native Eingaben werden nicht abgefangen.

„Regions & DAW-Exporte“ erhält die bisherige erweiterte Ansicht mit Regions, Loops, Minimap und Austauschformaten für Schnittprogramme. „Einfache Arbeitsansicht“ ist der Rückweg. Ein Wechsel fragt nach dem Verwerfen offener Eingaben; Regions vor dem Wechsel speichern. Die Zielformate ersetzen keine Prüfung von Zeitbasis, Projektstart und tatsächlicher Importunterstützung in der jeweiligen DAW.

## Ruhigeres Design

Karten verwenden ruhige, themeabhängige Flächen statt großer Farbverläufe. Schatten und Hover-Bewegung sind reduziert. Sprechertexte erhalten größere Zeilenabstände. Die Sidebar besitzt eigene Text-, Suchfeld- und Auswahlfarben, die zum individuellen Sidebarhintergrund passen, unabhängig vom Hell-/Dunkeldesign des Hauptbereichs. Persönliche Farb- und Schriftgrößeneinstellungen bleiben erhalten.

## Update installieren

1. In PodCore ein vollständiges ZIP-Backup exportieren und außerhalb des Programmordners sichern.
2. PodCore stoppen. Den bisherigen Programmordner als Rückfallkopie aufbewahren.
3. Das neue App-Paket in einen neuen Programmordner entpacken. Daten unter `PODCORE_DATA_DIR` beziehungsweise dem bisherigen `.podcore`-Datenverzeichnis nicht löschen oder durch Demo-Daten ersetzen. Eigene Umgebungsvariablen und Start-/Dienstkonfiguration übernehmen.
4. Die Abhängigkeiten mit dem mitgelieferten Installationsskript beziehungsweise dem bisherigen pnpm-Installationsablauf installieren. Für einen eigenen Build `pnpm run build:check` ausführen.
5. Den Server mit der bisherigen Konfiguration starten. Prüfen, dass vorhandene Daten geladen werden und v2.16.54 angezeigt wird. Bei alten Browserassets hart neu laden.

Es darf nicht gleichzeitig eine zweite Instanz auf dasselbe SQLite-Datenverzeichnis zugreifen. Das Paket enthält ausschließlich die PodCore-App; WordPress-Plugins, Websitevorlagen, Videos und Testdaten sind nicht enthalten.

## Durchgeführte Prüfungen

Produktionsbuild von Client und Server, Versionssynchronität und `git diff --check` wurden geprüft. Zusätzlich wurden echte Chromium-/Backend-Durchläufe mit einer isolierten SQLite-Instanz ausgeführt: Menüsuche mit fortgesetzter Texteingabe; Episodenerstellung; Skript-/Textbearbeitung; Fokusmodus; Strg+S und gespeicherter Serverstand; Übergang zu Produktion/Abnahme; blockierter PDF-Export bei erzwungenem Speicherfehler; Metadaten-Autosave bei offenen Skriptänderungen; Hell-Theme nach Neuladen; Listenfilter/Reset; mobile Navigation bei 390 × 844 Pixeln; Sidebar-Scroll bei Auswahl der unteren Einstellungen; Menüshortcut und Sprachwechsel.

Der Audio-Durchlauf nutzte eine echte WAV-Datei und prüfte Decodierung, persistente Marken, zeitbezogene Kommentare, vollständigen JSON-Export trotz Suchfilter, tatsächlichen PDF-Download, Zeitvalidierung und Wechsel zwischen einfacher und erweiterter Ansicht. Die Audio-PDF wurde zusätzlich als Text gelesen und enthielt die beiden Marken sowie den Kommentar in zeitlicher Reihenfolge. Die abschließenden geprüften Arbeitswege erzeugten keine unbehandelten JavaScript-Fehler. Ein zunächst gefundener WaveSurfer-Abbruch beim Ansichtswechsel wurde behoben und der Durchlauf wiederholt.

Vorhandene Smoke-Tests für Berechtigungskatalog, Audio-Abnahme sowie Tutorial-/Mehrfach-Podcast-/Log-Schutz wurden ausgeführt. Die isolierten Komponententests der Episodenübersicht und Audioansicht ergänzen diese echten Durchläufe. Der kombinierte Entwicklerlizenz-/WordPress-Test setzt ein separat installiertes Lizenzplugin voraus und konnte in dieser App-only-Umgebung nicht ausgeführt werden. Dies ist keine vollständige Abnahme aller Betriebssysteme, Screenreader oder externer DAW-/Cloud-Integrationen; deren unveränderte Anbindungen wurden nicht neu end-to-end getestet.

## Quellen des Bedienkonzepts

Häufige Aktionen sichtbar lassen und seltene Optionen erst auf Anfrage öffnen folgt dem beschriebenen Prinzip der Progressive Disclosure; klare Beschriftungen und nicht zu viele Verschachtelungsebenen sind dabei wichtig. [1] Die Navigation verwendet native Links/Schaltflächen mit `aria-expanded`, `aria-controls` und `aria-current`, nicht ein für komplexe Anwendungsmenüs reserviertes `role=menu`. [2]

### References

[1]: https://www.nngroup.com/articles/progressive-disclosure/ "Nielsen Norman Group – Progressive Disclosure"
[2]: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation-hybrid/ "W3C WAI-ARIA APG – Disclosure Navigation Menu with Top-Level Links"
