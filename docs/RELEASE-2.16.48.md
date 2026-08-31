# PodCore v2.16.48 – mobile Tutorialführung und Wiki-Vervollständigung

Version **2.16.48** behebt die überfüllte Tutorialdarstellung auf kleineren Bildschirmen. Screenshot, Anweisungstext und Markierungsliste konkurrieren nicht länger mit der Aktionsleiste. Die überarbeitete Führung bleibt während langer Beschreibungen lesbar und bedienbar.

| Bereich | Verbesserung in v2.16.48 |
|---|---|
| Kartenlayout | Die mobile Tutorialkarte belegt einen begrenzten, sicheren Bereich am unteren Bildschirmrand und lässt oberhalb Platz für das hervorgehobene App-Ziel. |
| Lange Inhalte | Screenshot, Beschreibung und Markierungsliste liegen in einem eigenen scrollbaren Inhaltsbereich. Texte umbrechen innerhalb der Karte, statt sich mit anderen Bereichen zu überlagern. |
| Aktionen | Fortschrittsanzeige und Aktionsleiste bleiben außerhalb des Inhaltsbereichs sichtbar. Alle Tutorialaktionen erhalten explizite Touch- und Pointer-Event-Regeln. |
| Klickschritte | **Zum Bereich** positioniert das Ziel auf kleinen Displays am sichtbaren oberen Rand. Die Karte verdeckt die Bedienung des Ziels nicht mehr vollständig. |
| Verschieben | Auf größeren Bildschirmen bleibt das Tutorialfenster über seine Kopfzeile verschiebbar. Auf Touch-Geräten ist diese Geste bewusst deaktiviert, damit Scrollen und Buttons konfliktfrei funktionieren. |
| Wiki | Neue und überarbeitete Einträge erläutern die mobile Führung, Markierungen, Klickschritte, ZIP-Vollbackups, Importvorschau, Rückfallsicherung, Aufbewahrung und Legacy-JSON-Importe. |

## Bedienung

Starten Sie ein verfügbares Tutorial über **Hilfe / Wiki**. Auf einem Mobilgerät befindet sich die Tutorialkarte am unteren Bildschirmrand. Scrollen Sie innerhalb des oberen Inhaltsbereichs, wenn Screenshot, Markierungen oder Erklärung länger sind. Nutzen Sie die sichtbare Aktionsleiste für den nächsten Schritt. Bei einem Klickschritt verwenden Sie bei Bedarf zunächst **Zum Bereich** und klicken danach das violett hervorgehobene Ziel an. Mit **Wiki** wechseln Sie jederzeit aus der Führung in die vollständige Anleitung.

## Prüfung

Die Änderung wurde mit einem Testtutorial geprüft, das einen Screenshot, drei ausführliche Markierungstexte und einen Klickschritt enthält. Im Mobilviewport **390 × 844 Pixel** waren der Inhaltsbereich unabhängig scrollbar und die Aktionen **Weiter**, **Zum Bereich** sowie **Abschließen** bedienbar. Nach dem Abschluss war die zugrunde liegende App wieder ohne verbliebene Überlagerung nutzbar. Zusätzlich wurde der Client-Produktionsbuild erfolgreich erstellt.
