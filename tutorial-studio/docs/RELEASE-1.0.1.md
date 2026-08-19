# Tutorial Studio 1.0.1

## Zweck

Tutorial Studio 1.0.1 ist die erste fertig paketierte, eigenständige Desktop-Anwendung zur Erstellung von markierten Schritt-für-Schritt-Tutorials für Desktop-Software und Webanwendungen. Die Anwendung basiert funktional auf dem Tutorialsystem von PodCore 2.16.21, läuft aber ohne PodCore-Installation.

## Enthaltene Funktionen

| Funktionsbereich | Stand in 1.0.1 |
| --- | --- |
| Projekteditor | Fertig: Titel, Beschreibung, Zielanwendung, Startkontext, Zielgruppen und Status |
| Schrittverwaltung | Fertig: anlegen, duplizieren, löschen und sortieren |
| Bildschirmmaterial | Fertig: Bildschirm/Fenster über Electron auswählen oder Bilddatei importieren |
| Annotationseditor | Fertig: nummerierte Markierungen setzen, beschreiben und entfernen |
| Endnutzer-Vorschau | Fertig: Schrittfolge, Bild, Markierungserklärungen sowie Zurück/Weiter-Navigation |
| Import und Export | Fertig: portable `.tutorial.json`-Datei für generische Verwendung |
| PodCore-Export | Fertig: PodCore-2.16.21-kompatible Tutorial-JSON für die bestehende Tutorial-Verwaltung |
| Markenauftritt | Fertig: tutorialbezogene Bildmarke, die Screenshot, Hinweisnummer und Cursor kombiniert |

## Plattformpakete

Ein macOS-ZIP wurde als unsigniertes x64-Paket erzeugt. Der portable Windows-Ordner wurde als ZIP-Paket bereitgestellt. Der installierbare Windows-NSIS-Setup und die macOS-DMG-Datei werden über die enthaltene GitHub-Actions-Release-Pipeline auf nativen Windows- und macOS-Runnern erstellt.

> Unsigned macOS builds may require a one-time confirmation in macOS Gatekeeper. For a public distribution, code signing and notarization should be configured in the release workflow.

## Qualitätssicherung

Der TypeScript- und Vite-Produktions-Build, der Electron-Hauptprozess, die lokale Linux-Paketierung sowie ein Start-Smoketest des gepackten Electron-Bundles wurden erfolgreich durchgeführt. Die Browser-Vorschau bestätigte Editor, Schrittverwaltung und Endnutzer-Vorschau.
