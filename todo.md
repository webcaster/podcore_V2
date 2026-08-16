# Offene Punkte für das nächste Stabilitäts-Update

- [ ] Lizenzsystem nach Abschluss der Stabilisierung bewusst aktivieren: 14 Tage Volltest, 14 Tage Offline-Grace-Period und anschließender Nur-Lese-Modus.
- [ ] Lizenzverwaltung erst im Stabilitäts-Release wieder sichtbar schalten und vor der Veröffentlichung mit DLM auf podcore.de testen.
- [ ] Lizenzstufen Basis, Studio und Lifetime vor Aktivierung final mit den geplanten Lizenzprodukten und Lizenzschlüsseln abgleichen.

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
