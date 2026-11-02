# PodCore v2.16.52 – freundlichere Bedienung und UX-Härtung

## Umfang

v2.16.52 verbessert die zentralen Bedienpfade der App, ohne Datenmodelle oder den persistenten Datenordner zu verändern. Der Schwerpunkt liegt auf lesbaren Themes, zuverlässiger Tastaturbedienung, mobiler Navigation, verständlicher Fehlerführung und klareren Dashboard-Zuständen.

## Änderungen

- Kontraststärkere Texttokens für Hell- und Dunkeldesign.
- Lesbarer Hover-Zustand für primäre Buttons.
- Einheitlicher `:focus-visible`-Fokus für Links, Buttons, Formulare und interaktive Elemente.
- Unterstützung von `prefers-reduced-motion` für Nutzer, die Bewegungen reduzieren möchten.
- Modale Dialoge mit Fokusmanagement, Escape-Schließen, Tab-Zirkulation und Fokus-Rückgabe.
- Mobiles Hauptmenü mit beschriftetem Öffnen-/Schließen, Escape-Unterstützung und Fokusführung.
- Toast-Meldungen mit `role="status"` bzw. `role="alert"`, `aria-live` und beschriftetem Schließen.
- Tutorialpanel mit getrenntem Ladefehler, Retry-Aktion und Such-Reset.
- Dashboard ohne leere Schnellzugriffskarte, wenn keine Aktion berechtigt ist.
- Ausstehende Freigaben bleiben erreichbar, auch wenn das entsprechende Widget ausgeblendet wurde.

## Prüfung

- `git diff --check` erfolgreich.
- Versionsprüfung erfolgreich.
- Client-Build erfolgreich.
- Server-TypeScript-Build erfolgreich.
- Synchronisierung des Frontend-Builds nach `server/public` erfolgreich.
- App-only-Endnutzerpaket ohne WordPress-, PHP- und Videodateien erstellt.
- Keine Datenbankmigration erforderlich.

## Upgrade

Der persistente PodCore-Datenordner darf beim Update nicht gelöscht werden. Die Änderungen werden nach dem Neustart der neuen App-Version aktiv. Bestehende Benutzerprofile, persönliche Themes, Dashboard-Layouts, Tutorials und Backups bleiben erhalten.
