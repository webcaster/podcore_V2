# PodCore 2.16.46 – Verwaltungsrechte für Tutorials und Cloud-Katalog

## Ausgangslage

PodCore 2.16.46 führt die geprüfte Korrektur für Tutorialverwaltung und WordPress-Cloud auf dem aktuellen Patchstand 2.16.45 fort. Damit werden importierte Tutorials nicht mehr durch eine zusätzliche Entwicklerlizenzprüfung aus der Verwaltungsansicht ausgeschlossen.

## Änderungen

| Bereich | Ergebnis |
|---|---|
| Verwaltungsrechte | Die Endpunkte für Auflisten, Erstellen, Bearbeiten, Löschen und Fortschrittsverwaltung von Tutorials prüfen jetzt **`canManageTutorials`**. Administratoren sowie explizit berechtigte Rollen können Tutorials ohne zusätzlichen Entwickler-Modus verwalten. |
| Verwaltungsimport | Einzelprojekte, Listen und Kataloge mit `items`, `tutorials` oder `data.items` werden als Importquellen erkannt. Fehlende Rollen werden mit `*` für alle Rollen ergänzt und konkrete Serverfehler werden im Interface sichtbar. |
| App-Cloud | Synchronisierte WordPress-Tutorials werden lokal gespeichert, erscheinen anschließend in der Tutorial-Verwaltung und können dort verwaltet oder entfernt werden. |
| WordPress-Katalog | Das lokale Plugin 1.2.5 stellt unter `wp-json/app-tutorials/v1/tutorials` veröffentlichte Tutorial-Projekte für die App-Synchronisation bereit. |
| Markeranzeige | Der Viewer positioniert Bildmarker zusätzlich per Inline-Stil innerhalb des Bildrahmens, damit WordPress-Themes oder Caches die Überlagerung nicht in den normalen Seitenfluss verschieben. |

## Prüfung

Getestet wurden der vollständige Client-/Server-Build, lokaler Verwaltungsimport, Sichtbarkeit als Karte in der Tutorial-Verwaltung, Aktivierungswechsel, Löschung, ein WordPress-kompatibler Cloud-Sync mit neun Schritten sowie die Bildmarker im Dashboard und in der Audio-Qualitätskontrolle.
