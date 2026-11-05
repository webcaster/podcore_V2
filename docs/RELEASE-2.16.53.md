# PodCore v2.16.53 – stabile Formulare, Sidebar und Tutorials

## Behobene Probleme

Bei der Eingabe in Modal-Formularen sprang der Fokus nach dem ersten Buchstaben auf den Schließen-Button. Die Ursache lag in der zentralen Fokusverwaltung des Modals: Inline-Callbacks erzeugten bei jedem Rendern einen neuen `onClose`-Wert und starteten dadurch den Cleanup zu früh.

Zusätzlich wurde das gespeicherte helle Design erst nach einem Sprachwechsel zuverlässig sichtbar. Beim Wechsel zu unteren Menüpunkten konnte die Sidebar ihre Scrollposition verlieren. In Tutorials fehlte eine klare Reaktion auf Fehler beim Speichern des Fortschritts.

## Änderungen

- Fokusmanagement des zentralen Modals stabilisiert; Formulareingaben bleiben im aktiven Feld.
- Eindeutige Dialogtitel-IDs pro Modalinstanz ergänzt.
- Ruhigere, themeabhängige Dialog- und Formularflächen für lange Arbeitsphasen.
- Gespeichertes Nutzer-Theme beim Auth-Start zuverlässig anwenden.
- Theme-Synchronisation gegen Eventschleifen abgesichert.
- Sidebar-Scrollposition beim Seitenwechsel bewahren.
- Tutorial per Escape schließen können.
- Tutorialschritt mit `aria-labelledby` und `aria-describedby` semantisch verknüpft.
- Fehler beim Speichern des Tutorialfortschritts direkt in der Führung anzeigen.
- Wiki-Fallback und Fortsetzung des aktuellen Tutorialschritts bei Speicherfehlern erhalten.

## Prüfung

- `git diff --check` erfolgreich.
- Client-Build erfolgreich.
- Server-TypeScript-Build erfolgreich.
- Frontend-Synchronisierung nach `server/public` erfolgreich.
- Versionsprüfung für v2.16.53 erfolgreich.
- Keine Datenbankmigration erforderlich.
- Endnutzerpaket wird nach dem finalen Build auf App-only-Inhalte auditiert.

## Upgrade

Der persistente PodCore-Datenordner darf beim Update nicht gelöscht werden. Die Änderungen greifen nach dem Neustart der neuen Version. Benutzerprofile, Themes, Dashboard-Layouts, Tutorials und Backups bleiben erhalten.
