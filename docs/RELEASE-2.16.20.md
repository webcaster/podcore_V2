# PodCore v2.16.20 – Tutorial-Aufzeichnung und optionale Screenshots

Version **2.16.20** ergänzt die Tutorial-Verwaltung um einen Aufzeichnungsmodus. Tutorials können nun als interaktive App-Führung erstellt werden, ohne dass Screenshots den Erstellungs- oder Speichervorgang blockieren.

## Klickaufzeichnung mit Call-outs

Im Tab **Schritte** stehen zwei neue Wege bereit: **„Klick aufzeichnen“** ergänzt ein bestehendes Element, während **„Schritt durch Klick aufzeichnen“** einen neuen Schritt vorbereitet. PodCore wechselt dabei in die für die Tutorialrolle konfigurierte Zielansicht. Ein Klick auf ein mit `data-tutorial-id` vorbereitetes Menü oder Bedienelement wird als stabiles Klickziel, Zielroute und lesbare Bezeichnung erfasst.

Anschließend ergänzt der Autor einen Titel, eine kurze Erklärung und den Interaktionsmodus. Der gespeicherte Schritt erscheint später genau auf der aufgezeichneten Route als markiertes Ziel mit Call-out. Nutzer können den Klick ausführen, einen Schritt bestätigen oder einen Hinweis lesen und weitergehen – abhängig vom gewählten Modus.

| Erfasste Information | Verwendung bei der Wiedergabe |
|---|---|
| Zielkennung | Markiert das passende Menü oder Bedienelement |
| Zielroute | Führt bei Bedarf zur aufgezeichneten Seite |
| Titel und Erklärung | Erscheinen als kontextbezogener Call-out |
| Interaktionsmodus | Steuert Klickbestätigung, manuelle Bestätigung oder Hinweisführung |

## Screenshots und Markierungen

Screenshots sind ab dieser Version **optional**. Die interaktive App-Führung benötigt kein Bild und lässt sich vollständig ohne Screenshot speichern und wiedergeben. Screenshots mit nummerierten Markierungen bleiben für die WordPress-Website, die PDF-Fassung und den JSON-Download empfohlen. Dadurch kann ein Tutorial in der App schnell und interaktiv entstehen, während später bei Bedarf eine reichhaltige Dokumentationsversion veröffentlicht wird.

Neue Schritte erhalten automatisch einen verständlichen Standardtitel. Beim Speichern werden leere Bildfelder bereinigt; Markierungen werden ausschließlich zu einem vorhandenen Screenshot gespeichert. So bleiben Schritte mit Screenshot, mit Markierungen, ohne Markierungen oder komplett ohne Bild gültig.

## Prüfung

Die Versionsprüfung, der Client-TypeScript-Build, der Server-TypeScript-Build und die Produktionssynchronisierung waren erfolgreich. Zusätzlich wurde geprüft, dass Klickaufzeichnung, aufgezeichnete Route, optionale Screenshotdaten und die Normalisierung der Tutorialdaten zusammen gebaut werden können.
