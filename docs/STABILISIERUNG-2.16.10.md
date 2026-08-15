# Stabilisierung v2.16.10

## Ziel dieses Ersatzpakets

Dieses Paket ersetzt das zuvor veröffentlichte v2.16.10-Archiv, ohne die Versionsnummer zu verändern. Es konzentriert sich auf eine sichere Aktualisierung, klare PDF-Zuständigkeiten und zuverlässig gespeicherte persönliche Design-Einstellungen.

| Bereich | Anpassung |
|---|---|
| App-Update | Das fehleranfällige Anwenden innerhalb der laufenden App ist nicht mehr sichtbar. Die Seite zeigt nur noch Version, GitHub-Release und App-ZIP-Download. |
| Manuelle Installation | Die Anwendung erklärt den sicheren Ablauf: PodCore beenden, Programmdateien ersetzen, Datenordner und `podcore.db` beibehalten, einmal neu starten. |
| PDF-CI-Farben | Die globale Einstellung wurde entfernt. Farben, Schriften und Layoutmerkmale werden ausschließlich im jeweiligen PDF-Layout gepflegt. |
| Mein Design | Akzentfarbe, Sidebar-Farbe, Schriftgröße und Hell-/Dunkelmodus werden im Benutzerprofil zusammen gespeichert und nach Moduswechseln erneut angewendet. |
| Add-ons | Die spätere Architektur ist als sichere Daten-, Vorlagen- und Konfigurationspakete dokumentiert; sie wird in der kostenlosen Stabilitätsphase nicht aktiviert. |

## Prüfungen

- Client und Server wurden mit `pnpm run build:check` gebaut.
- Das Git-Diff wurde auf Whitespace-Fehler geprüft.
- Eine isolierte Instanz bestätigte die sichtbare Subline, v2.16.10, die neue Update-Ansicht und das vollständige Persistieren einer geänderten Akzentfarbe im Benutzerprofil.

## Hinweis für Updates

> Bewahren Sie den PodCore-Datenordner und insbesondere `podcore.db` immer auf. Das App-ZIP ersetzt nur Programmdateien und nicht Ihre Podcast-Daten, Benutzer oder lokalen Tutorials.
