# Tutorial Studio 1.0.2

**Tutorial Studio** ist eine eigenständige Desktop-Anwendung zum Erstellen von Schritt-für-Schritt-Tutorials für Desktop-Software und Webanwendungen. Sie übernimmt den Kern des Tutorialsystems aus **PodCore 2.16.21**, löst ihn aber bewusst von einer einzelnen Anwendung: Tutorials können für jede Benutzeroberfläche erstellt, als JSON-Projekt gesichert und später wieder importiert werden.

## Was die Anwendung kann

| Bereich | Funktion |
| --- | --- |
| Lokales Projektarchiv | Mehrere Tutorials für unterschiedliche Software und Webanwendungen lokal anlegen, durchsuchen, öffnen, duplizieren, archivieren und wiederherstellen |
| Tutorial-Projekt | Titel, Zielanwendung, URL oder Startkontext, Beschreibung, Zielgruppen und Aktivierungsstatus pflegen |
| Schritt-Editor | Schritte anlegen, duplizieren, löschen und neu sortieren |
| Visuelle Anleitung | Screenshot aus Datei übernehmen oder geöffnetes Fenster beziehungsweise Bildschirm auswählen |
| Markierungen | Nummerierte Punkte direkt auf dem Screenshot setzen und zu jeder Markierung eine Erklärung hinterlegen |
| Interaktion | Schritte als Hinweis, Klick oder Bestätigung kennzeichnen; Element- und Routenkontext hinterlegen |
| Vorschau | Das Tutorial aus der Perspektive von Endnutzerinnen und Endnutzern durchklicken |
| PDF-Handbuch | Mehrseitiges PDF mit Schritten, Screenshots, eingebrannten Markierungen und Erklärungen; Dokumenttitel, Untertitel, eigenes Logo, Footertext und Dateiname sind je Projekt einstellbar |
| Austausch | Vollständige Projekte als portables JSON exportieren und wieder importieren; zusätzlicher PodCore-Export erzeugt unmittelbar importierbare Tutorialdaten |
| Lokale Sicherheit | Projekte werden zusätzlich lokal im Browser-Speicher der Desktop-Anwendung zwischengespeichert; der bewusste Export erzeugt die übertragbare Projektdatei |

> Die JSON-Felder für Schritte, Ziel, Interaktion, Screenshot und Annotationen entsprechen dem Datenmodell des Tutorialsystems aus PodCore 2.16.21. Dadurch lassen sich Inhalte für eine spätere PodCore-Integration eindeutig abbilden.

## Für Windows und macOS installieren

Die veröffentlichten Release-Dateien stehen im Abschnitt **Releases** des Repositorys bereit. Unter Windows wird die Datei `Tutorial-Studio-<Version>-Setup.exe` heruntergeladen und ausgeführt. Unter macOS wird die DMG-Datei geöffnet und die Anwendung in den Programme-Ordner gezogen.

Bei der ersten Nutzung der Bildschirm- oder Fenstererfassung kann macOS die Berechtigung **Bildschirmaufnahme** anfordern. Diese Berechtigung wird in den macOS-Systemeinstellungen für Tutorial Studio erteilt. Ohne Berechtigung können weiterhin vorhandene Bilddateien importiert und markiert werden.

## Schnellstart

1. Öffne **Projekte** und lege für jede Software oder Webanwendung ein eigenes lokales Tutorial-Projekt an.
2. Vergib unter **Tutorial-Projekt** einen Titel sowie die Zielanwendung. Nicht benötigte Projekte können im Archiv sicher abgelegt und später wiederhergestellt werden.
3. Lege im Bereich **Schritte** den ersten Arbeitsschritt an und formuliere eine klare Handlung für Endnutzerinnen und Endnutzer.
4. Wähle **Bildschirm wählen** oder **Bild importieren**, um eine passende Ansicht anzuhängen.
5. Klicke auf den Screenshot, um nummerierte Markierungen zu setzen. Ergänze darunter eine kurze Erklärung für jeden Punkt.
6. Öffne die **Endnutzer-Vorschau** und prüfe Reihenfolge, Texte und sichtbare Markierungen.
7. Konfiguriere unter **PDF-Layout** bei Bedarf den Dokumenttitel, Untertitel, Dateinamen, Footer und ein eigenes Logo. Wähle dann **PDF exportieren** für das druckbare Handbuch.
8. Wähle **Projekt exportieren**, um eine portable Datei mit der Endung `.tutorial.json` zu speichern.

## Projektformat

Ein Tutorial wird als JSON mit der Schema-Version `1.0` gespeichert. Bilder werden als Data-URL integriert, damit ein Projekt auch ohne zusätzliche Bildordner vollständig übertragbar bleibt.

```json
{
  "schemaVersion": "1.0",
  "title": "Episoden anlegen",
  "applicationName": "Beispielanwendung",
  "audience": ["Redaktion"],
  "steps": [
    {
      "id": "step-…",
      "title": "Neue Episode öffnen",
      "description": "Wähle die Schaltfläche Neue Episode.",
      "target": "#new-episode",
      "route": "/episodes",
      "interaction": "click",
      "position": "bottom",
      "allowSkip": true,
      "image": "data:image/png;base64,…",
      "annotations": [
        { "id": "mark-…", "x": 73.4, "y": 21.8, "label": "1", "description": "Öffnet den Editor." }
      ]
    }
  ]
}
```

## Entwicklung

Voraussetzungen: **Node.js 22 LTS** und **pnpm 10 oder neuer**.

```bash
cd tutorial-studio
pnpm install
pnpm dev
```

Für einen Produktions-Build:

```bash
pnpm build
```

Für lokale Plattformpakete:

```bash
pnpm dist
```

Die GitHub-Actions-Datei `.github/workflows/tutorial-studio-release.yml` erstellt Windows- und macOS-Pakete auf nativen Runnern. Für eine veröffentlichte Version wird ein Tag nach dem Muster `tutorial-studio-v1.0.2` verwendet.

## Hinweise zur Integration in PodCore

Tutorial Studio ist bewusst eigenständig. Für den Import nach PodCore 2.16.21 wird das exportierte JSON über die Tutorial-Verwaltung importiert. PodCore ergänzt beim Speichern die anwendungsspezifischen Rollen und Berechtigungen. Allgemeine Tutorials können außerdem über die bestehende WordPress-Tutorial-API publiziert und in PodCore kontrolliert synchronisiert werden.
