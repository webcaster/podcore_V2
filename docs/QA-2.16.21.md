# PodCore v2.16.22 – Fehler- und Releasecheck

## Zweck und Umfang

Dieses Prüfprotokoll dokumentiert die technische Freigabeprüfung der aktuellen PodCore-Version. Die Tests wurden mit einer isolierten temporären SQLite-Datenbank durchgeführt, damit keine lokalen Nutzerdaten oder Sicherungen verändert werden.

| Prüfbereich | Verfahren | Ergebnis |
|---|---|---|
| Versionskonsistenz | Abgleich von Root-, Client-, Server- und Browser-Version | Erfolgreich: überall v2.16.22 |
| Client | TypeScript-Prüfung und Vite-Produktionsbuild | Erfolgreich |
| Server | TypeScript-Build | Erfolgreich |
| Produktionsausgabe | Synchronisierung des Client-Builds nach `server/public` | Erfolgreich |
| Quellformat | Git-Diff-Prüfung auf Leerraum- und Patchfehler | Erfolgreich |
| Abhängigkeiten | Prüfung der Produktionsabhängigkeiten auf bekannte kritische Schwachstellen | Keine bekannten kritischen oder hohen Schwachstellen |
| Laufzeit | Temporäre Serverinstanz mit eigener Testdatenbank | Erfolgreich gestartet |
| Frontend-Auslieferung | Abruf der Produktionsstartseite | HTTP 200 |
| Gesundheitsstatus | Abruf von `/api/health` | Status `ok`, Version v2.16.22 |
| Anmeldung | Fehlanmeldung und Standardanmeldung in Testdatenbank | HTTP 401 beziehungsweise HTTP 200 |
| Tutorialschutz | Unangemeldeter Tutorialabruf | HTTP 401 |
| Tutorialzugriff | Angemeldeter Abruf der Tutorialliste | HTTP 200 |
| Berechtigungsschutz | Unangemeldeter Sicherungsabruf | HTTP 401 |
| Administration | Angemeldeter Abruf der Systemdiagnose | HTTP 200 |
| Sicherung | Angemeldeter Abruf von Automationsstatus und Sicherungsliste | Jeweils HTTP 200 |

## Spezifische Tutorialregressionen

| Funktion | Erwartetes Verhalten | Technische Prüfung |
|---|---|---|
| Weiter-Aktion | Ein Tutorial bleibt nicht blockiert, wenn ein Klickziel fehlt oder nicht verfügbar ist. | Tutorialkarte bleibt sichtbar; Klickschritte haben einen manuellen Weiter-Fallback. |
| Untermenüziele | Ein Ziel öffnet den richtigen Tab innerhalb der Seite. | Zielauswahl speichert stabile Kennung und vollständige Route, etwa `/settings?tab=theme`. |
| Klickaufzeichnung | Die Route eines Untermenüs bleibt im aufgezeichneten Schritt erhalten. | Aufzeichnung speichert `pathname` und `search` gemeinsam. |
| Zwischenschritte | Hinweis- und Detailblöcke können zwischen zwei Schritten eingefügt werden. | Aktion fügt einen bearbeitbaren Schritt direkt nach dem ausgewählten Ursprungsschritt ein. |
| Screenshot-Detailausschnitt | Ein Teil eines Screenshots kann als genauer Anleitungsschritt verwendet werden. | Canvas-Zuschnitt erstellt ein neues Bild; enthaltene Markierungen werden neu skaliert. |
| Tutorial-PDF | Text und zugehöriger Screenshot bleiben in einem Seitenblock. | Vorabprüfung des benötigten vertikalen Platzes vor Zeichnen des Schritts. |

## Manuelle Abnahme nach Installation

> Vor produktiver Verwendung sollte ein Administrator die folgenden Abläufe mit einer Sicherungskopie seiner eigenen Daten prüfen, weil konkrete Rollen, externe Speicherverbindungen, vorhandene Inhalte und lokale Geräteumgebungen installationsspezifisch sind.

| Ablauf | Manueller Prüfschritt |
|---|---|
| Detailausschnitt | Ein Tutorial öffnen, einen Screenshot auswählen, **Ausschnitt** wählen, Bereich aufziehen und als Zwischenschritt einfügen. Anschließend speichern, erneut öffnen und als PDF exportieren. |
| Untermenü | Im Editor einen Zieltab aus Einstellungen, Administration, Branding oder Redaktions-Hub auswählen und über **Klick aufzeichnen** prüfen, dass der richtige Unterbereich geöffnet wird. |
| Wiederherstellung | In einer Testumgebung einen nicht kritischen Inhalt löschen, im Papierkorb wiederherstellen und die Berechtigungsgrenze für Nicht-Administratoren prüfen. |
| Sicherung | Vor Änderungen eine manuelle Sicherung erzeugen und deren Wiederherstellungsansicht ohne endgültiges Einspielen kontrollieren. |
| Externe Dienste | Podigee-, Speicher- und WordPress-Verbindungen nur mit den eigenen gültigen Zugangsdaten und einer Testressource prüfen. |
