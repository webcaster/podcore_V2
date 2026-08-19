# UX-Prüfung Tutorial Studio 1.0.2

## Geprüfte Funktionen

Die lokale Browser-Vorschau zeigt die neue Toolbar mit **Projekte**, Import, PodCore-Export, PDF-Export und Projekt-Export. Das PDF-Layout erscheint als eigener Bereich in den Projektdetails; Dokumenttitel, Untertitel, PDF-Dateiname, Footertext und die Auswahl eines eigenen PDF-Logos sind sichtbar.

Das Projektarchiv öffnet als modaler Dialog. Es enthält Suche, getrennte Ansichten für aktive und archivierte Projekte, die Aktion zum Anlegen eines neuen Projekts sowie Aktionen zum Öffnen, Duplizieren und Archivieren. Das aktive Projekt wird eindeutig markiert.

## Korrekturpunkt

Der lange Standardtitel „Unbenanntes Tutorial“ kann bei schmaler Seitenleiste in der Überschrift optisch zu eng wirken. Vor dem finalen Paket wird die Zeilenumbruch- und Trennregel der Seitenleistenüberschrift angepasst.

## PDF-Smoketest

Der PDF-Export wurde über die sichtbare Anwendung ausgelöst. Tutorial Studio meldete erfolgreich die Erstellung von `unbenanntes-tutorial.pdf`. Damit sind das dynamische Laden der PDF-Bibliothek, der Dokumentaufbau und der browserbasierte Dateidownload funktionsfähig. Die individualisierten Layoutfelder werden beim nächsten Export mit den jeweiligen Projektwerten verwendet.
