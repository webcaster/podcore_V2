# Tutorial Studio 1.0.2

## Neuer Funktionsumfang

Tutorial Studio 1.0.2 erweitert die Anwendung von einem einzelnen Arbeitsstand zu einem lokalen Projektarchiv. Für jede Software, Desktop-Anwendung oder Webanwendung kann jetzt ein eigenes Tutorial-Projekt angelegt werden. Projekte lassen sich durchsuchen, öffnen, duplizieren, archivieren und wiederherstellen. Archivierung ist bewusst keine endgültige Löschung.

| Bereich | Umsetzung |
| --- | --- |
| Mehrprojektverwaltung | Neue lokale Projektbibliothek mit aktivem Projekt, Suchfunktion und separater Archivansicht |
| Sicheres Archiv | Projekte werden als archiviert markiert, behalten alle Schritte, Screenshots und Markierungen und können wiederhergestellt werden |
| PDF-Layout | Jedes Projekt speichert Dokumenttitel, Untertitel, Dateinamen, Footertext und optional ein eigenes Logo |
| PDF-Ausgabe | Das Endnutzer-PDF übernimmt die Layoutoptionen und integriert Screenshots mit eingebrannten Markierungen und Beschreibungen |
| Migration | Ein bereits gespeichertes Einzelprojekt wird beim Start automatisch in die lokale Bibliothek übernommen |

## PDF-Handbuch konfigurieren

Die Konfiguration erfolgt im Abschnitt **PDF-Layout** des jeweils geöffneten Projekts. Das optionale Logo wird als Bilddatei in das Projekt eingebettet, damit exportierte Projekte und PDF-Erstellungen unabhängig von externen Dateipfaden bleiben. Der PDF-Dateiname kann vollständig frei gewählt werden.

## Qualitätssicherung

Der erweiterte Projektcheck kontrolliert Datenmodell, lokale Bibliothek, Dialogoberfläche, PDF-Export, Desktop-Sicherheit und den plattformübergreifenden Release-Workflow. Der TypeScript- und Vite-Build sowie die Electron-Hauptprozess-Kompilierung wurden erfolgreich durchgeführt.
