# PodCore v2.16.50 – stabileres helles Design

## Behobenes Problem

Im hellen Design konnten nach der Deutsch-/Englisch-Umschaltung oder beim Anklicken eines Eingabefeldes dunkle Bereiche erscheinen. Teilweise waren Karten und Formulare dadurch uneinheitlich eingefärbt.

## Ursache

Beim Anwenden der persönlichen Theme-Daten wurden neben den individuellen Werten auch Grundwerte der aktiven Hell-/Dunkelpalette entfernt. CSS-Fallbacks führten anschließend zu dunklen Flächen. Zusätzlich fehlte für den Fokuszustand von Feldern ein eigener heller Zwischenfarbwert.

## Korrektur

- Grundwerte der aktiven Theme-Palette bleiben beim Anwenden des Nutzerprofils erhalten.
- Nur persönliche Überschreibungen wie Akzentfarbe, Sidebar-Farbe und Schriftgröße werden zurückgesetzt bzw. neu angewendet.
- Neuer Farbtoken `--color-obsidian-750` für helle und dunkle Fokus-/Hoverflächen.
- Eingabefelder, Selects und Textareas bleiben im hellen Design auch bei Hover und Fokus hell.
- Feste dunkle `color-scheme`-Vorgaben für Selects und Textareas entfernt.
- Die Sprachumschaltung aktualisiert weiterhin die Profilsprache, ohne das aktive Farbschema zu beschädigen.

## Prüfung

- `git diff --check` erfolgreich.
- Versionsprüfung erfolgreich.
- Client-Build erfolgreich.
- Server-Build erfolgreich.
- Synchronisierung nach `server/public` erfolgreich.
- App-only-Endnutzerpaket ohne WordPress-, PHP- und Videodateien erstellt.

## Upgrade

Das Update benötigt keine Datenbankmigration. Der persistente Datenordner darf beim Update nicht gelöscht werden.
