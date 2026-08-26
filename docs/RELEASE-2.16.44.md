# PodCore 2.16.44 – Tutorialverwaltung und WordPress-Cloud

## Anlass

Importierte Tutorials konnten in der Tutorial-Verwaltung als leer erscheinen, obwohl die Datei oder eine Cloud-Synchronisation zuvor ausgelöst wurde. Die Verwaltung war zusätzlich unnötig an den Entwickler-Modus gebunden.

## Korrekturen

| Bereich | Änderung |
|---|---|
| Tutorial-Verwaltung | Alle Funktionen der Verwaltungsseite verwenden jetzt die Berechtigung **`canManageTutorials`**. Dadurch können Administratoren und explizit berechtigte Rollen Tutoriale anzeigen, importieren, bearbeiten, aktivieren und löschen, ohne zusätzlich den Entwickler-Modus aktivieren zu müssen. |
| Lokaler Verwaltungsimport | Einzelprojekte, JSON-Listen, `items`-Kataloge und WordPress-Kataloge werden erkannt. Fehlende Rollen werden automatisch als Freigabe für alle Rollen gesetzt. Fehlgeschlagene Einträge werden mit einer konkreten Fehlermeldung ausgewiesen. |
| App-Cloud | Synchronisierte Tutorials werden als lokale Offlinekopien gespeichert und anschließend in der Verwaltungsliste angezeigt. Sie können dort wie lokale Tutorials deaktiviert, bearbeitet und gelöscht werden. |
| WordPress-Plugin | PodCore Add-on Catalog stellt mit Version 1.2.5 die öffentliche Route `https://podcore.de/wp-json/app-tutorials/v1/tutorials` bereit. Diese ist der erwartete Katalogendpunkt der PodCore Tutorial-Cloud. |
| Tutorial-Viewer | Die Marker erhalten zusätzliche Inline-Positionierungswerte. Dadurch liegen sie auch bei Theme- oder Cache-Konflikten verlässlich über dem Screenshot statt unterhalb der Bildfläche. |

## Konfiguration

In **Tutorial-Verwaltung → Tutorial-Cloud** ist als Basisadresse einzutragen:

```text
https://podcore.de/wp-json/app-tutorials/v1
```

Danach werden **Aktiviert** und optional **Auto-Sync vormerken** gesetzt, die Einstellungen gespeichert und anschließend **Cloud-Tutorials synchronisieren** gewählt. Das WordPress-Tutorial muss zuvor veröffentlicht sein und eine gültige Projektdatei enthalten.

## Prüfung

Der Release wurde mit Client-/Server-Build, PHP-Syntaxprüfung des Plugins, lokalem Verwaltungsimport mit Sichtbarkeit, Bearbeitung und Löschen sowie einem WordPress-kompatiblen Cloud-Katalogtest mit einem synchronisierten Tutorial und neun Schritten geprüft. Die Bildmarkierungen wurden zusätzlich für Dashboard und Audio-Qualitätskontrolle auf ihre Positionierung innerhalb des Bildrahmens getestet.
