# Offene Punkte für das nächste Stabilitäts-Update

- [ ] Lizenzsystem nach Abschluss der Stabilisierung bewusst aktivieren: 14 Tage Volltest, 14 Tage Offline-Grace-Period und anschließender Nur-Lese-Modus.
- [ ] Lizenzverwaltung erst im Stabilitäts-Release wieder sichtbar schalten und vor der Veröffentlichung mit dem eigenen WordPress-Lizenzplugin auf podcore.de testen.
- [x] Lizenzierung bei Neuinstallation: Aktivierung, Statusprüfung und Offline-Lizenzimport ohne vorherige App-Anmeldung ermöglichen; Fehler „Nicht authentifiziert“ beheben.
- [x] Erststart: 14-Tage-Testhinweis mit Verweis auf podcore.de und verständlicher Erklärung zu Online- sowie Offline-Lizenzierung anzeigen.
- [x] Lizenzarchitektur: DLM-spezifische App- und Serveranbindung durch sichere Aktivierung, Status, Deaktivierung und Offline-Lizenz über das eigene WordPress-Lizenzplugin ersetzen.
- [x] WordPress-Lizenzplugin: Kundenbereich für eigene Lizenzen, aktive Abos, Laufzeiten, Installationen und Offline-Dokumente ergänzen.
- [x] WordPress-Lizenzplugin: Kündigungsablauf für WooCommerce Subscriptions mit eindeutiger Bestätigung, Restlaufzeit und nachvollziehbarem Status ergänzen.
- [x] WordPress-Lizenzplugin: Kunden- und Lizenzendpunkte durch Besitzprüfung, Nonces, Rate Limits, sichere Tokenverarbeitung und datensparsame Ausgaben weiter härten.
- [x] WordPress-Lizenzplugin: Lizenzdaten im Administrationsbereich sicher bearbeiten, Aktivierungen gezielt widerrufen und Lizenzen erst nach ausdrücklicher Bestätigung endgültig löschen.
- [x] WordPress-Lizenzplugin: Zentrale Kundenansicht mit zugehörigen Lizenzen, Abos und Aktivierungen sowie signiertem Notfall-Download pro konkreter Installation ergänzen.
- [x] Lizenz-PDF: Aus PodCore herunterladbaren Lizenznachweis mit PodCore-Signet, Subline, Kennzeichnung „medien der sinne“, „Eine Idee von Maximilian Hartwich“, goldener Trennlinie und Fußzeile als einheitlichen Marken-Kopfbereich ergänzen.
- [x] v2.16.34: Tutorialführung gegen fehlende oder fehlerhafte Schrittlisten abgesichert, im Tutorialfenster und im Tutorial-Menü einen direkten Wiki-Zugang ergänzt sowie das zentrale Wiki um eine Hilfe zur alternativen Nutzung erweitert.
- [x] v2.16.34: Tutorial-PDF-Export korrigiert, sodass Punkt-, Kreis- und Zeichenmarkierungen unabhängig vom Screenshotformat direkt in der PDF sichtbar gezeichnet werden.
- [x] v2.16.34: Add-on-Architektur, Freischaltung, Kompatibilitätsprüfung und Präsentation über das bestehende WordPress-Add-on-Plugin als Roadmap dokumentiert.
- [ ] Lizenzstufen Basis, Studio und Lifetime vor Aktivierung final mit den geplanten Lizenzprodukten und Lizenzschlüsseln abgleichen.
- [ ] Separate lokale Entwickler-Testversion erstellen: Lizenzoberfläche und Testaktivierung sichtbar, klar als Nicht-Produktivmodus markiert, ohne GitHub-Upload.
- [ ] Lokale Entwicklerwerkzeuge ergänzen: Systemdiagnose, kontrollierte Testdaten, lokale Fehlerprotokolle, Funktionsstatus und sichere Entwicklungsaktionen ohne Produktivdaten zu verändern.
- [x] WordPress-Tutorial-Plugin für PodCore überarbeitet: JSON-Import, Screenshot-Verarbeitung, The7/WPBakery-kompatible Grid-Ausgabe, Download und sichere Fehlerbehandlung geprüft und als separates lokales ZIP bereitgestellt.
- [x] Nutzertest-Patch Sponsoring: Abrechnungsablauf mit Verträgen, Buchungen und Leistungsübersicht fachlich geprüft und korrigiert.
- [x] Kritischer Nutzertest-Patch Sponsoring: Buchungen beim Sponsor speichern, nach Neuladen anzeigen und bearbeiten; API-, Datenbank- und UI-Pfad gemeinsam abgesichert.
- [x] Kritischer Nutzertest-Patch Tutorials: Einzelnes Tutorial als vollständige JSON-Datei herunterladen; Detailansicht, Download-Handler, Rollen, Screenshots und Re-Import geprüft.
- [x] Nutzertest-Patch Papierkorb: Löschen, Wiederherstellen und endgültige Bereinigung für Episoden, Ideen, Sponsoren und Medien erneut geprüft.
- [x] Nutzertest-Patch Papierkorb: Direkte Papierkorb-Zugriffe in den Bereichen mit Löschfunktionen ergänzt und den aktuellen Bereich beim Öffnen vorgefiltert.
- [x] Nutzertest-Patch Papierkorb: Endgültiges Löschen ausschließlich für `canManageTrash` mit deutlicher Sicherheitsfrage, Objektname und nicht umkehrbarer Bestätigung umgesetzt.
- [x] Patch v2.16.15: Alle nach abgeschlossenem Nutzertest bestätigten Sponsoring-, Tutorial-, Episoden-, Audio- und Papierkorbkorrekturen gebündelt, geprüft und dokumentiert.
- [x] Patch v2.16.15 WordPress-Workflow: Tutorial-Plugin und App-Austausch für Einzel-JSON-Downloads, Screenshot-Übernahme, Katalog-Metadaten, Kompatibilitätsprüfung, Importstatus und verständliche Fehlerhinweise verbessert.
- [x] Nutzertest-Patch Sponsoring: Feldgrößen, Zahlenfelder und Währungsauswahl in der Werbeplatzbuchung konsistent und responsiv ausgerichtet.
- [x] Nutzertest-Patch Episoden-Editor: Bezeichnung „Buchungen v2 v2.12.0“ in „Werbeplatzbuchungen“ geändert und die nicht benötigte Live-Vorschau entfernt.
- [x] Nutzertest-Patch Tutorials: Abgeschlossene Tutorialschritte und bereits angesehene Tutorials pro Benutzer dauerhaft speichern und korrekt wiederherstellen.
- [x] Nutzertest-Analyse Episoden-Editor: Bearbeitungsfluss, Blockverwaltung, technische Standardprofile, Werbeplatzbuchungen, Freigaben und Fehlerrobustheit analysiert.
- [x] Nutzertest-Analyse WaveSurfer-Audio-Editor: Ladeverhalten, Wiedergabe, Wellenform, Marker, Kommentare, Loop, Tastatursteuerung, Schnittplan-Export und Fehlermeldungen analysiert.
- [x] Nutzertest-Patch WaveSurfer-Audio-Editor: Markierungen, Regionen, zeitbezogene Kommentare und Dateimetadaten als übersichtliche PDF-Schnittliste exportieren.
- [x] Nutzertest-Analyse WaveSurfer-Audio-Editor: Adobe-Audition-Importweg für PodCore-Schnittlisten geprüft und als CSV-Export plus Anleitung ergänzt.
- [x] Kritischer WordPress-Tutorial-Patch: JSON-Import übernimmt Schritttexte, Beschreibungen, Bildverknüpfungen und Marker vollständig; Frontend zeigt pro Schritt eine lesbare, nummerierte Screenshot-Annotation inklusive Erklärung.
- [x] Tutorial-Führung in der App: Schritte navigieren bei Bedarf zur Zielseite, markieren das konfigurierte Menü oder Bedienelement sichtbar, führen den nächsten Klick kontextbezogen und speichern den Fortschritt pro Benutzer.
- [x] Tutorial-Interaktivität: Schrittaktionen mit sichtbarem Ziel, kontextbezogener Klickanweisung, optionaler Bestätigung, Fortschrittsanzeige, sicherer Wiederaufnahme und rollenbewussten Hilfen erweitert.
- [x] Kritischer Tutorial-Patch: Klickzielerfassung beim Erstellen eines Schritts sichtbar, nachvollziehbar und unabhängig von Screenshot-Markierungen gespeichert.
- [x] Kritischer Tutorial-Patch: Screenshot-Aufnahme und nummerierte Markierungen als optionale, klar beschriebene Erstellungsfunktion beibehalten; Bilddaten blockieren den Schritt-Workflow nicht mehr.
- [x] Kritischer Tutorial-Patch: Neue Tutorialschritte zuverlässig mit Screenshot, mit Markierungen, ohne Markierungen oder vollständig ohne Bild speichern.
- [x] Kritischer Tutorial-Patch: Interaktive App-Tutorials ohne Screenshot vollständig nutzbar gemacht; Screenshots und Markierungen werden als optionale, qualitätsgesicherte Website- und Exportinhalte behandelt.
- [x] Tutorial-Aufzeichnungsmodus: Admins erfassen während eines geführten Durchlaufs Klickziele und Hinweise als Schritte; Nutzer erhalten diese später als kontextbezogene Call-outs auf der richtigen Seite.
- [x] Tutorial-Sequenzaufzeichnung: Mehrere Klicks, Unterschritte, Zwischenhinweise und optionale Screenshots in einem laufenden Durchgang erfassen und als geordnete interaktive Anleitung wiedergeben.
- [x] WordPress-Tutorial-Workflow: Mehrstufige Klicksequenzen, Unterschritte, Zwischenhinweise und optionale Screenshots aus PodCore-JSON vollständig übernehmen und als klare Schrittfolge darstellen.
- [x] WordPress-Tutorial-Workflow: Pro Tutorial ein frei wählbares Titelbild im Backend sowie eine konsistente Titelbilddarstellung im Grid und in der Detailansicht ergänzt.
- [x] Kritischer Tutorial-Bugfix v2.16.21: Nach dem Speichern im geöffneten Tutorial bleiben, den aktuellen Bearbeitungszustand aktualisieren und nur über eine bewusste Aktion zur Tutorialübersicht wechseln.
- [x] Kritischer Tutorial-Bugfix v2.16.21: Tutorialfenster responsiv begrenzt, mit internem Scrollbereich versehen und alle Hinweise sowie Aktionsschaltflächen auf kleinen Bildschirmen erreichbar gehalten.
- [x] Tutorial-Screenshot-Editor: Neben nummerierten Punkten frei positionierbare Kreise und Zeichen mit Farbe, Größe und Erklärung eingefügt, bearbeitbar gemacht und in der App dargestellt.
- [x] WordPress-Tutorial-Workflow: Punkt-, Kreis- und Zeichenmarkierungen mit Farbe, Größe und Erklärung aus v2.16.21-Tutorialen importieren und in Grid sowie Detailansicht darstellen.
- [x] Tutorialführung: Verschachtelte Untermenüs wie Einstellungen zuverlässig öffnen, den Schritt zum Zielbereich führen und erwartete Klicks erkennen.
- [x] WordPress-Tutorial-Plugin v2.16.12 nach Abschluss des App-Bugfixes final prüfen, Anleitung aktualisieren und als separates Installationspaket bereitstellen.
- [x] Tutorial-PDF: Überschrift, Beschreibung, Markierungslegende und zugehörigen Screenshot je Schritt zusammenhängend mit intelligenter Seitenumbruchprüfung ausgeben.
- [x] Tutorial-Editor: Zwischen normalen Schritten gezielte Ausschnitt- beziehungsweise Hinweisblöcke mit eigener Überschrift, Erklärung, optionalem Screenshot und Markierungen einfügen.
- [x] Tutorial-Editor: Direkt nach jedem vorhandenen Schritt eine sichtbare Aktion „Zwischenschritt einfügen“ anbieten und den neuen Schritt exakt an dieser Position erstellen.
- [x] Kritischer Tutorial-Bugfix: Aktion „Weiter“ und Klickerkennung in der Tutorialführung wieder zuverlässig aktivieren, damit Nutzer jeden Schritt fortsetzen können.
- [x] Tutorialführung: Tutorialfenster im interaktiven Modus per Kopfbereich verschiebbar machen und eine sichtbare Rücksetzung auf die Standardposition anbieten.
- [x] Tutorial-Editor: Vorhandene Screenshot-Bilder interaktiv zuschneiden und den gewählten Bereich als Detailausschnitt in einen neuen oder bestehenden Zwischenschritt übernehmen.
- [x] Tutorial-Editor: Alle verschachtelten Untermenüs als eindeutige Klickziele auswählen und bei der Aufzeichnung mit vollständiger Route zuverlässig übernehmen.
- [x] Dashboard-Tutorial: „Dashboard Einstellungen“ als stabiles Untermenüziel mit Route, Klickaufzeichnung und zuverlässiger Wiedergabe ergänzen.
- [x] Tutorialführung: Komplexe Menüs appweit nach dem Dashboard-Muster mit getrennten Öffnungs- und Bearbeitungszielen, vollständigen Routen und Aufzeichnungsübergabe standardisieren.
- [x] WordPress-Tutorial-Plugin: Aktuelle Untermenürouten und komplexe Menühinweise aus PodCore v2.16.24 beim JSON-Import verständlich darstellen und separat als Pluginpaket bereitstellen.
- [x] Tutorial-Editor: Abgedunkelte oder ausgeblendete Screenshots wieder normal sichtbar darstellen, ohne Markierungen, Zuschnitt oder Bearbeitungsaktionen zu beeinträchtigen.
- [x] Tutorial-Editor: Bereits gespeicherte Screenshots nachträglich öffnen, Markierungen bearbeiten und das aktualisierte Bild ohne erneute Aufnahme speichern.
- [x] PDF-Layouts: Tutorial-Export als eigenen anpassbaren Dokumenttyp mit Farben, Typografie, Kopf- und Fußbereich, Bildgröße, Schrittzählern, Markierungen und Menüpfaden integrieren.
- [x] Mehrsprachigkeit: PodCore vollständig auf Deutsch und Englisch nutzbar machen, mit sprachbezogener Auswahl pro Benutzer und sicherer Standardsprache Deutsch.
- [x] Rechtschreibprüfung: In Textfeldern eine einstellbare Prüfung für Deutsch und Englisch mit klaren Browserhinweisen und zugänglichen Fehlermeldungen ergänzen.
- [x] Administration: Wörterbücher und zulässige eigene Fachbegriffe pro Sprache verwalten, importieren, exportieren und für die Rechtschreibprüfung bereitstellen.
- [x] Release-Korrektur: Versionsnummer in Browser-Build, Endnutzerarchiv, GitHub-Tag und Release-Anhang einheitlich prüfen und den Versionskonflikt beheben.
- [x] Abschlussprüfung: Vollständigen PodCore-Fehlercheck mit Versionsprüfung, Client- und Server-Build, Produktionssynchronisierung, Tutorialregressionen und Release-Archivprüfung vor der Bereitstellung durchführen.
- [x] Risikoprüfung: Fehleranfällige Kernabläufe für Anmeldung, Berechtigungen, Datenbank, Sicherung, Tutorialfortschritt, Import/Export, Screenshot-Verarbeitung sowie Löschen und Wiederherstellen gezielt testen.
- [x] Episoden-Editor: Technischen Hinweis zu fehlenden v2-Buchungen durch eine klare Leeransicht für Werbeplatzbuchungen mit direkter Anlegen- oder Auswahlaktion ersetzt.
- [x] Design-Update: Visuelle Sprache des `podcore_promo_video_v2.mp4` analysiert und als zugängliches, konsistentes Designsystem in Navigation, Karten, Formulare und Kernseiten der App übertragen.
- [x] Stabilitätsupdate: Überdimensionierte Zahlen-, Auswahl- und Formfelder anhand der betroffenen Komponenten konsistent verdichtet, ohne Touch- oder Lesbarkeit zu verschlechtern.
- [x] Stabilitätsupdate Redaktions-Hub: Interviewpartner bei großen Mengen mit Suche, Filtern, Status und kompakter Listenansicht übersichtlich verwalten.
- [x] Stabilitätsupdate Redaktions-Hub: Umfangreiche Fragenkataloge mit Suche, Freigabefilter, Seitenaufteilung und klarer Reihenfolge skalierbar bearbeiten.
- [x] Stabilitätsupdate Sponsoring: Werbekategorien fachlich klarer strukturiert, beschrieben und für Angebote sowie Buchungen konsistent dargestellt.
- [x] Stabilitätsupdate Mein Design: Persönliche Akzent-, Sidebar-, Schrift- und Moduseinstellungen zuverlässig normalisiert, beim Start wiederhergestellt und gegen unpassende Werte abgesichert.
- [x] Stabilitätsupdate Sicherung: Konfigurierbare automatische lokale Backups, Aufbewahrung, Prüfsummen, Wiederherstellungsprüfung und verständliche Wiederherstellungsführung ergänzt.
- [x] Stabilitätsupdate Sicherung: Kombination A + B umgesetzt – In-App-Sicherungen bei Start und Intervallen sowie optionale tägliche Systemplanung für geschlossene App-Instanzen.

## Branding

- [ ] SVG-Signet und App-Favicon mit der Subline „Dein Podcast. Dein Workflow.“ in PodCore v2.16.10 integrieren.

## Priorisierter Bugfix

- [ ] Screenshot-Markierungen im Tutorial-Editor wieder per Klick setzen, speichern und in der Vorschau sowie im PDF anzeigen.
- [ ] Tutorial-Erstellung mit geführten Schritten, robuster Screenshot-Annotation, rollenbezogener Vorschau und Ergebnis-Preview verbessern.
- [ ] Vektor-Branding und Subline gemeinsam mit den Tutorial-Korrekturen als v2.16.10-Release prüfen und bereitstellen.
- [ ] Lizenzshop und Add-on-Marktplatz nach dem Stabilitäts-Release als getrennte Shop- und API-Architektur planen.

## Stabilisierung v2.16.10

- [ ] Eigenes Update-Anwenden, Staging-Upload und Sicherheits-Token aus der sichtbaren App-Einstellung entfernen; nur einen Hinweis auf GitHub-Release und ZIP-Download anzeigen.
- [ ] „PDF CI-Farben“ aus den App-Einstellungen entfernen, weil Farbgebung vollständig in den PDF-Layouts gepflegt wird.
- [ ] Speichern und Anwenden aller „Mein Design“-Einstellungen mit einer vollständigen Reinitialisierung der Design-Tokens prüfen und korrigieren.
- [ ] Add-on-System als spätere, lizenzierte Modularchitektur dokumentieren; erst nach dem Stabilitäts- und Lizenz-Release aktivieren.

## Repository- und Release-Bereinigung

- [x] Öffentlichen PodCore-GitHub-Branch von websitefremden Dateien bereinigen; nur app-relevante Quellen und Dokumentation behalten.
- [x] GitHub-Releases bereinigt: Es wird ausschließlich die geprüfte Endnutzer-App-ZIP v2.16.10 ohne Zusatzpakete und Promo-Medien angeboten.
- [x] Aktuellen GitHub-Stand erneut prüfen und sämtliche nicht apprelevanten Dateien oder Release-Anhänge entfernen; WordPress-, Webseiten-, Video- und sonstige Begleitdateien bleiben außerhalb des Repositorys.
- [x] Separat hinzugefügtes Tutorial-Studio-Projekt einschließlich Workflow-Datei aus dem PodCore-Repository entfernen, da es nicht Teil der PodCore-App ist.

## Persönliches Dashboard

- [x] Dashboard-Anpassungen pro Benutzerkonto dauerhaft speichern: Widget-Auswahl, Widget-Reihenfolge, sichtbare Bereiche und Layout-Präferenzen werden strukturiert im Benutzerprofil gesichert.

## Episoden-Skript und Export

- [x] Fehlerhafte Sonderzeichen im Episoden-Skript sowie in der PDF-Ausgabe bereinigen: Zeichenstabile Tabellenüberschriften und zentrale UTF-8-Normalisierung sind aktiv.
- [x] Seitennummerierung des Episoden-Skript-PDFs vereinheitlichen: Footer, Wasserzeichen und Gesamtseitenzahl werden erst nach allen Seitenumbrüchen über die tatsächlichen PDF-Seiten verteilt.

## Sponsoring-Matching v2.16.11

- [x] Interessen und Themenpräferenzen pro Sponsor erfassen, dauerhaft speichern und für nachvollziehbare Matching-Vorschläge mit Episoden, Ideen und Zielgruppen auswerten.
- [x] Matching-Ansicht um Interessentreffer, Match-Begründungen und transparente Gewichtung erweitern.

## Episoden-Editor v2.16.11 – Freigabe erforderlich

- [x] Technik-Standard im Episoden-Editor als wiederverwendbares Profil mit Übernehmen- und Zurücksetzen-Aktionen ergänzen; episodenbezogene Abweichungen bleiben separat.

## Speicherwahl und Cloud-Anbindung v2.16.11

- [x] Appweite Speicherstrategie konfigurieren: Lokale PodCore-Daten bleiben führend; vollständige Sicherungen werden als klar erzeugte Cloud-Backup-Datei exportiert, ohne automatische Verschiebung lokaler Originaldaten.
- [x] Speicherort, Verfügbarkeit und Wiederherstellungsweg appweit transparent anzeigen; Cloud-Backup-Export bleibt fehlertolerant und lässt lokale Daten unangetastet.
- [x] Nutzeroberfläche für Speicherentscheidungen ergänzen: Arbeitsdatenbank, Sicherungsinhalt, Zeitpunkt des Backups, letzter erfolgreicher Export und Anleitung zur eigenen Online-Ablage klar darstellen.
- [x] Für eine spätere Online-Datenbank einen sicheren Online-zu-Lokal-Fallback vorsehen: lokale Vorsicherung, Datenvorschau, Integritätsprüfung und bestätigter Wechsel ohne stilles Überschreiben.
- [x] Ersteinstellungen nach der ersten sicheren Administrator-Anmeldung ergänzen: lokale Datenführung, Backup-Erstellung, Online-Ablage-Hinweis und spätere Änderbarkeit werden auf dem Dashboard angezeigt.

## Hotfix v2.16.11

- [x] Schwarze Seite beim Öffnen einer Sponsor-Detailansicht durch fehlertolerante Normalisierung historischer und aktueller Sponsor-Daten behoben; korrigiertes Endnutzer-Release v2.16.12 bereitstellen.

## Sponsorenbuchungen und Preise

- [x] Buchungsablauf, Preisbestandteile, Rabatte, Laufzeiten und Konfliktprüfungen im Sponsoring vereinheitlichen und verständlicher darstellen.
- [x] Buchungsvorschau mit nachvollziehbarer Preisberechnung, Leistungsumfang und Abrechnungsdaten vor dem Speichern ergänzen.
- [x] Preislisten-PDF so erweitern, dass pro Werbe-Position sämtliche hinterlegten Daten vollständig und mehrseitig ausgegeben werden.

## Qualitätsprüfung und Weiterentwicklung

- [x] PodCore nach dem Sponsoring-Update auf TypeScript-, Build-, Datenmigrations-, Export- und zentrale Nutzerwegfehler prüfen; Ergebnisse in `docs/QUALITAETSPRUEFUNG-2.16.13.md` festhalten.
- [x] Anwenderorientierten Verbesserungsplan mit Prioritäten, Nutzen und Abhängigkeiten für die nächsten PodCore-Versionen erstellen.

## Priorisierte Weiterentwicklung nach v2.16.13

- [ ] Episoden-Speichern und automatische Werbeplatz-Zuweisung atomar in einer Datenbanktransaktion ausführen.
- [ ] Gemeinsame Payload-Validierung für Episoden, Buchungen und Angebote ergänzen.
- [ ] Authentifizierungs-Rate-Limit mit Ablaufbereinigung und vertrauenswürdiger Proxy-Konfiguration robust gestalten.
- [ ] Sponsor-Detailseite und PDF-Exporte in testbare Unterkomponenten beziehungsweise Dienste aufteilen.

## Datenbank-Stabilisierung

- [x] Lokale SQLite-Datenbank hinsichtlich Migrationen, Sperren, Integritätsprüfung, Sicherung, Wiederherstellung und Diagnose verbessern.

## Papierkorb und Berechtigungen

- [x] Zentralen Admin-Papierkorb für versehentlich gelöschte Inhalte mit Wiederherstellung, nachvollziehbarer Herkunft und kontrollierter endgültiger Bereinigung implementieren.
- [x] Rollen und Berechtigungen für Löschen, Wiederherstellen und endgültiges Bereinigen prüfen und konsistent durchsetzen.
